package com.springboot.MyTodoList.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import com.springboot.MyTodoList.model.DocumentChunkTT;
import com.springboot.MyTodoList.repository.DocumentChunkTTRepository;

/**
 * Rebuilds the Lucene BM25 index from Oracle on every startup.
 *
 * Oracle is the source of truth (chunks persisted in DOCUMENT_CHUNK_TT).
 * Lucene is a search cache — fast, but ephemeral. This service ensures
 * the cache is always warm when the application is ready to serve requests.
 */
@Service
public class RagIndexRebuildService {

    private static final Logger logger = LoggerFactory.getLogger(RagIndexRebuildService.class);

    @Autowired
    private DocumentChunkTTRepository chunkRepository;

    @Autowired
    private LuceneService luceneService;

    /**
     * Fires after the full Spring context (including JPA) is ready.
     * Reads all chunks from Oracle and re-indexes them into Lucene,
     * grouped by (projectId, docId) to match LuceneService.indexChunks() signature.
     */
    @EventListener(ApplicationReadyEvent.class)
    public void rebuildOnStartup() {
        logger.info("RAG index rebuild starting...");

        List<DocumentChunkTT> all;
        try {
            all = chunkRepository.findAll();
        } catch (Exception e) {
            logger.error("RAG index rebuild failed — could not read chunks from DB: {}", e.getMessage(), e);
            return;
        }

        if (all.isEmpty()) {
            logger.info("RAG index rebuild: no chunks in DB, nothing to index.");
            return;
        }

        // Group chunks by projectId → docId → ordered list of text
        // LinkedHashMap preserves insertion order (chunks are stored ordered by chunkIndex)
        Map<Long, Map<Long, RebuildEntry>> grouped = new LinkedHashMap<>();
        for (DocumentChunkTT chunk : all) {
            grouped
                .computeIfAbsent(chunk.getPjId(),  k -> new LinkedHashMap<>())
                .computeIfAbsent(chunk.getDocId(),  k -> new RebuildEntry(chunk.getDocName()))
                .chunks.add(chunk.getChunkText());
        }

        int totalDocs   = 0;
        int totalChunks = 0;

        for (Map.Entry<Long, Map<Long, RebuildEntry>> projectEntry : grouped.entrySet()) {
            long projectId = projectEntry.getKey();
            for (Map.Entry<Long, RebuildEntry> docEntry : projectEntry.getValue().entrySet()) {
                long         docId   = docEntry.getKey();
                RebuildEntry entry   = docEntry.getValue();
                luceneService.indexChunks(projectId, docId, entry.docName, entry.chunks);
                totalDocs++;
                totalChunks += entry.chunks.size();
            }
        }

        logger.info("RAG index rebuild complete: {} documents, {} chunks across {} projects.",
            totalDocs, totalChunks, grouped.size());
    }

    private static class RebuildEntry {
        final String       docName;
        final List<String> chunks = new ArrayList<>();
        RebuildEntry(String docName) { this.docName = docName != null ? docName : "unknown"; }
    }
}
