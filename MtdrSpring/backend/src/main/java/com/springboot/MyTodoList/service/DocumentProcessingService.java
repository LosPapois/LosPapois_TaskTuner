package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.DocumentTT;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.telegram.telegrambots.meta.api.methods.GetFile;
import org.telegram.telegrambots.meta.api.objects.File;
import org.telegram.telegrambots.meta.generics.TelegramClient;

import java.io.IOException;

/**
 * Downloads a document sent via Telegram, extracts its text with PDFBox,
 * and persists the result in DOCUMENT_TT for RAG context injection.
 *
 * DB requirement:
 *   ALTER TABLE document_tt ADD (extracted_text CLOB);
 */
@Service
public class DocumentProcessingService {

    private static final Logger logger = LoggerFactory.getLogger(DocumentProcessingService.class);
    private static final int MAX_RAG_CHARS = 12_000;

    @Autowired
    private DocumentTTService documentTTService;

    /**
     * Downloads the Telegram file, extracts text, saves to DOCUMENT_TT.
     *
     * @param telegramClient active bot client
     * @param fileId         Telegram file_id from the received document
     * @param fileName       original file name shown to user
     * @param pjId           project the document belongs to
     * @return saved DocumentTT with extractedText populated, or null on failure
     */
    public DocumentTT processAndIndex(TelegramClient telegramClient,
                                      String fileId,
                                      String fileName,
                                      long pjId) {
        try {
            // 1. Resolve file path via Telegram API
            File tgFile = telegramClient.execute(GetFile.builder().fileId(fileId).build());

            // 2. Download to temp file
            java.io.File localFile = telegramClient.downloadFile(tgFile);

            // 3. Extract text
            String text = extractText(localFile, fileName);

            // 4. Truncate to avoid oversized context (keep first MAX_RAG_CHARS chars)
            if (text.length() > MAX_RAG_CHARS) {
                text = text.substring(0, MAX_RAG_CHARS) + "\n[... truncated]";
            }

            // 5. Persist
            DocumentTT doc = new DocumentTT();
            doc.setNamePjDoc(fileName);
            doc.setUrlObjStore("tg:" + fileId);   // Telegram file reference
            doc.setPjId(pjId);
            doc.setExtractedText(text.isBlank() ? null : text);
            // uploadDocument() stamps dateUpload and embedStatus='loading'
            DocumentTT saved = documentTTService.uploadDocument(doc);

            // Mark as loaded immediately (text is already extracted inline)
            documentTTService.markAsLoaded(saved.getDocId());
            saved.setEmbedStatus("loaded");

            // Cleanup temp file
            localFile.delete();

            logger.info("DocumentProcessingService: indexed '{}' ({} chars) for project {}",
                    fileName, text.length(), pjId);
            return saved;

        } catch (Exception e) {
            logger.error("DocumentProcessingService: failed to process '{}': {}", fileName, e.getMessage(), e);
            return null;
        }
    }

    private String extractText(java.io.File file, String fileName) throws IOException {
        String lower = fileName != null ? fileName.toLowerCase() : "";
        if (lower.endsWith(".pdf")) {
            try (PDDocument pdf = Loader.loadPDF(file)) {
                return new PDFTextStripper().getText(pdf).strip();
            }
        }
        // Plain text / other — read as UTF-8
        return new String(java.nio.file.Files.readAllBytes(file.toPath())).strip();
    }
}
