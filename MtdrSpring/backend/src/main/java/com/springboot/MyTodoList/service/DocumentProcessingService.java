package com.springboot.MyTodoList.service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.telegram.telegrambots.meta.api.methods.GetFile;
import org.telegram.telegrambots.meta.exceptions.TelegramApiException;
import org.telegram.telegrambots.meta.generics.TelegramClient;

import com.springboot.MyTodoList.model.DocumentChunkTT;
import com.springboot.MyTodoList.model.DocumentTT;
import com.springboot.MyTodoList.repository.DocumentChunkTTRepository;

/**
 * Downloads files from Telegram, extracts text, chunks it, and feeds it to
 * the Lucene BM25 index. Also persists document metadata via DocumentTTService.
 *
 * Supported formats: PDF, DOCX, TXT / plain text.
 */
@Service
public class DocumentProcessingService {

    private static final Logger logger = LoggerFactory.getLogger(DocumentProcessingService.class);

    private static final int CHUNK_SIZE    = 500;
    private static final int CHUNK_OVERLAP = 50;
    private static final long MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

    @Value("${telegram.bot.token}")
    private String botToken;

    @Autowired
    private LuceneService luceneService;

    @Autowired
    private DocumentTTService documentTTService;

    @Autowired
    private DocumentChunkTTRepository chunkRepository;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    /**
     * Full pipeline: download → extract → chunk → index → persist metadata.
     *
     * @param telegramClient  active Telegram client (to resolve file path)
     * @param fileId          Telegram file_id from the incoming document message
     * @param fileName        original file name (used for source attribution in RAG)
     * @param mimeType        MIME type string (may be null)
     * @param projectId       project this document belongs to
     * @return true on success, false on any error
     */
    public boolean processAndIndex(TelegramClient telegramClient,
                                   String fileId, String fileName,
                                   String mimeType, long projectId) {
        byte[] bytes = downloadFromTelegram(telegramClient, fileId, fileName);
        if (bytes == null) return false;

        String text = extractTextSafe(bytes, fileName, mimeType);
        if (text == null) return false;

        DocumentTT saved = persistDocumentMetadata(fileId, fileName, projectId);
        List<String> chunks = chunkText(text);
        persistAndIndexChunks(saved.getDocId(), projectId, fileName, chunks);

        logger.info("Indexed document '{}' ({} chunks) for projectId={}", fileName, chunks.size(), projectId);
        return true;
    }

    private byte[] downloadFromTelegram(TelegramClient telegramClient, String fileId, String fileName) {
        String filePath;
        try {
            org.telegram.telegrambots.meta.api.objects.File tgFile =
                telegramClient.execute(GetFile.builder().fileId(fileId).build());
            filePath = tgFile.getFilePath();
        } catch (TelegramApiException e) {
            logger.error("Cannot resolve Telegram file path for fileId={}: {}", fileId, e.getMessage());
            return null;
        }
        try {
            byte[] bytes = downloadFileBytes(filePath);
            if (bytes.length > MAX_FILE_BYTES) {
                logger.warn("File {} exceeds 20 MB limit, skipping", fileName);
                return null;
            }
            return bytes;
        } catch (Exception e) {
            logger.error("Failed to download file {}: {}", filePath, e.getMessage());
            return null;
        }
    }

    private String extractTextSafe(byte[] bytes, String fileName, String mimeType) {
        try {
            String text = extractText(bytes, fileName, mimeType);
            if (text == null || text.isBlank()) {
                logger.warn("No text extracted from {}", fileName);
                return null;
            }
            return text;
        } catch (Exception e) {
            logger.error("Text extraction failed for {}: {}", fileName, e.getMessage());
            return null;
        }
    }

    private DocumentTT persistDocumentMetadata(String fileId, String fileName, long projectId) {
        DocumentTT doc = new DocumentTT();
        doc.setNamePjDoc(fileName);
        doc.setUrlObjStore("telegram://" + fileId);
        doc.setPjId(projectId);
        return documentTTService.uploadDocument(doc);
    }

    private void persistAndIndexChunks(long docId, long projectId, String fileName, List<String> chunks) {
        chunkRepository.deleteByDocId(docId);
        List<DocumentChunkTT> chunkEntities = new ArrayList<>();
        for (int i = 0; i < chunks.size(); i++) {
            chunkEntities.add(new DocumentChunkTT(docId, projectId, i, chunks.get(i), fileName));
        }
        chunkRepository.saveAll(chunkEntities);
        luceneService.indexChunks(projectId, docId, fileName, chunks);
        documentTTService.markAsLoaded(docId);
    }

    // ─── Text extraction ──────────────────────────────────────────────────

    private String extractText(byte[] bytes, String fileName, String mimeType) throws IOException {
        String lowerName = fileName != null ? fileName.toLowerCase() : "";

        if (lowerName.endsWith(".pdf") || "application/pdf".equals(mimeType)) {
            return extractPdf(bytes);
        }
        if (lowerName.endsWith(".docx") ||
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document".equals(mimeType)) {
            return extractDocx(bytes);
        }
        // Default: treat as plain text (TXT, MD, CSV, etc.)
        return new String(bytes, java.nio.charset.StandardCharsets.UTF_8);
    }

    private String extractPdf(byte[] bytes) throws IOException {
        try (PDDocument pdf = Loader.loadPDF(bytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(pdf);
        }
    }

    private String extractDocx(byte[] bytes) throws IOException {
        try (InputStream is = new ByteArrayInputStream(bytes);
             XWPFDocument docx = new XWPFDocument(is)) {
            StringBuilder sb = new StringBuilder();
            for (XWPFParagraph p : docx.getParagraphs()) {
                String text = p.getText();
                if (text != null && !text.isBlank()) {
                    sb.append(text).append("\n");
                }
            }
            return sb.toString();
        }
    }

    // ─── Chunking ─────────────────────────────────────────────────────────

    /**
     * Split text into overlapping fixed-size chunks.
     * Overlap prevents sentence-boundary information loss.
     */
    List<String> chunkText(String text) {
        List<String> chunks = new ArrayList<>();
        if (text == null || text.isBlank()) return chunks;

        // Normalize whitespace runs but keep paragraph breaks
        text = text.replaceAll("[ \\t]+", " ").trim();

        int start = 0;
        while (start < text.length()) {
            int end = Math.min(start + CHUNK_SIZE, text.length());
            chunks.add(text.substring(start, end).trim());
            start += CHUNK_SIZE - CHUNK_OVERLAP;
        }
        return chunks;
    }

    // ─── Telegram download ────────────────────────────────────────────────

    private byte[] downloadFileBytes(String filePath) throws IOException, InterruptedException {
        String url = "https://api.telegram.org/file/bot" + botToken + "/" + filePath;
        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .GET()
            .build();
        HttpResponse<byte[]> response = httpClient.send(req, HttpResponse.BodyHandlers.ofByteArray());
        if (response.statusCode() != 200) {
            throw new IOException("Telegram file download returned HTTP " + response.statusCode());
        }
        return response.body();
    }
}
