package com.springboot.MyTodoList.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import oracle.jdbc.OracleType;
import org.apache.hc.client5.http.classic.methods.HttpPost;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.core5.http.io.entity.EntityUtils;
import org.apache.hc.core5.http.io.entity.StringEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Embed text via Cohere and store/retrieve vectors in Oracle 23ai.
 * Retrieval uses hybrid search (vector + keyword re-ranking) and optional
 * query expansion via Groq when GroqService is available.
 *
 * Table required:
 *   CREATE TABLE rag_chunks (
 *       chunk_id  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 *       doc_id    NUMBER REFERENCES document_tt(doc_id) ON DELETE CASCADE,
 *       pj_id     NUMBER,
 *       content   CLOB NOT NULL,
 *       embedding VECTOR(1024, FLOAT32)
 *   );
 *   CREATE VECTOR INDEX rag_chunks_idx ON rag_chunks(embedding)
 *   ORGANIZATION INMEMORY NEIGHBOR GRAPH
 *   DISTANCE COSINE WITH TARGET ACCURACY 95;
 */
@Service
public class VectorService {

    private static final Logger logger = LoggerFactory.getLogger(VectorService.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static final int    MAX_CHUNK_CHARS  = 800;
    private static final int    CHUNK_OVERLAP    = 80;
    private static final int    TOP_K            = 7;
    // Fetch more candidates before re-ranking
    private static final int    CANDIDATE_K      = TOP_K * 3;
    // Wide threshold for initial fetch; tight filtering happens after re-ranking
    private static final double WIDE_THRESHOLD   = 0.70;
    // Small docs: return all chunks — avoids TOP_K under-coverage for enumerated lists
    private static final int    SMALL_DOC_THRESHOLD = 30;
    // Keyword re-ranking: each keyword hit reduces distance by this amount (lower = more relevant)
    private static final double KEYWORD_WEIGHT   = 0.08;
    private static final double MAX_KEYWORD_BONUS = 0.30;

    private static final Set<String> STOPWORDS = Set.of(
        "de","el","la","los","las","un","una","unos","unas","en","es","se","que","y","a",
        "con","por","para","del","al","lo","le","su","sus","me","mi","te","tu",
        "the","an","is","are","was","were","in","on","at","of","to","for","with",
        "this","that","and","or","not","be","it","as","from","by","but","have","has"
    );

    @Value("${cohere.api.key}")
    private String cohereKey;

    @Value("${cohere.embed.url}")
    private String cohereEmbedUrl;

    // Optional: used for query expansion. Null-safe throughout.
    @Autowired(required = false)
    private GroqService groqService;

    private final DataSource dataSource;
    private final CloseableHttpClient httpClient = HttpClients.createDefault();

    // Cache query embeddings to avoid duplicate Cohere calls
    private final ConcurrentHashMap<String, float[]> queryEmbedCache = new ConcurrentHashMap<>();

    public VectorService(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    // ─── Public API ───────────────────────────────────────────────────────

    public void indexDocument(long docId, long pjId, String text) {
        if (text == null || text.isBlank()) return;
        List<String> chunks = chunkSemantic(text);
        logger.info("VectorService: indexing doc {} ({} chunks)", docId, chunks.size());

        for (String c : chunks) {
            try {
                float[] embedding = embed(c);
                insertChunk(docId, pjId, c, embedding);
            } catch (Exception e) {
                logger.error("VectorService: failed to index chunk for doc {}: {}", docId, e.getMessage());
            }
        }
    }

    /**
     * Retrieve top-K chunks for a query using:
     * 1. Query expansion (Groq, if available) → multiple query variants
     * 2. Vector search per variant → merged candidate pool
     * 3. Keyword re-ranking → final top-K
     */
    public List<String> retrieveChunks(String query, long pjId) {
        try {
            // Small doc: return all chunks — avoids TOP_K under-coverage for enumerated list queries
            long totalChunks = countChunks(pjId);
            if (totalChunks <= SMALL_DOC_THRESHOLD) {
                logger.debug("VectorService: small doc ({} chunks) — returning all for pjId {}", totalChunks, pjId);
                return fetchAllChunks(pjId);
            }

            List<String> queries = buildQueryVariants(query);
            List<String> keywords = extractKeywords(query);

            // Collect scored candidates from all query variants
            Map<String, Double> bestScoreByContent = new LinkedHashMap<>();
            for (String q : queries) {
                float[] emb = queryEmbedCache.computeIfAbsent(q, k -> {
                    try { return embedQuery(k); }
                    catch (IOException e) { throw new RuntimeException(e); }
                });
                List<ScoredChunk> candidates = fetchCandidates(emb, pjId);
                for (ScoredChunk sc : candidates) {
                    // Keep best (lowest) vector distance per unique chunk
                    bestScoreByContent.merge(sc.content, sc.score, Math::min);
                }
            }

            if (bestScoreByContent.isEmpty()) return List.of();

            // Keyword re-ranking: reduce score (distance) for chunks containing query keywords
            List<ScoredChunk> reranked = bestScoreByContent.entrySet().stream()
                .map(e -> {
                    double adjusted = e.getValue() - keywordBonus(e.getKey(), keywords);
                    return new ScoredChunk(e.getKey(), adjusted);
                })
                .sorted(Comparator.comparingDouble(sc -> sc.score))
                .limit(TOP_K)
                .collect(Collectors.toList());

            logger.debug("VectorService: {} candidates → {} after re-rank (queries={}, keywords={})",
                    bestScoreByContent.size(), reranked.size(), queries.size(), keywords);

            return reranked.stream().map(sc -> sc.content).collect(Collectors.toList());

        } catch (Exception e) {
            logger.error("VectorService: retrieval failed for pjId {}: {}", pjId, e.getMessage());
            return List.of();
        }
    }

    public void deleteChunksForDoc(long docId) {
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "DELETE FROM rag_chunks WHERE doc_id = ?")) {
            ps.setLong(1, docId);
            ps.executeUpdate();
        } catch (Exception e) {
            logger.error("VectorService: failed to delete chunks for doc {}: {}", docId, e.getMessage());
        }
    }

    // ─── Query Expansion ─────────────────────────────────────────────────

    /**
     * Use Groq to generate semantically similar query variants.
     * Falls back to original query if Groq is unavailable or fails.
     */
    private List<String> buildQueryVariants(String query) {
        if (groqService == null) return List.of(query);
        try {
            String systemPrompt =
                "You are a query expansion assistant. Given a user question, return a JSON array " +
                "of 2 alternative phrasings that capture the same intent but use different words. " +
                "Return ONLY a valid JSON array of strings, no explanation. Example: " +
                "[\"variant one\",\"variant two\"]";
            String raw = groqService.ask(systemPrompt, query);
            // Parse JSON array from response (may contain extra text)
            int start = raw.indexOf('[');
            int end   = raw.lastIndexOf(']');
            if (start == -1 || end == -1 || end <= start) return List.of(query);

            JsonNode arr = MAPPER.readTree(raw.substring(start, end + 1));
            List<String> variants = new ArrayList<>();
            variants.add(query); // original always first
            for (JsonNode node : arr) {
                String v = node.asText().strip();
                if (!v.isEmpty() && !v.equalsIgnoreCase(query)) variants.add(v);
            }
            logger.debug("VectorService: query expanded to {} variants", variants.size());
            return variants;
        } catch (Exception e) {
            logger.warn("VectorService: query expansion failed, using original: {}", e.getMessage());
            return List.of(query);
        }
    }

    // ─── Keyword Extraction & Scoring ────────────────────────────────────

    private List<String> extractKeywords(String query) {
        return Arrays.stream(query.toLowerCase().split("[\\s\\p{Punct}]+"))
            .filter(w -> w.length() > 2 && !STOPWORDS.contains(w))
            .distinct()
            .collect(Collectors.toList());
    }

    private double keywordBonus(String content, List<String> keywords) {
        if (keywords.isEmpty()) return 0.0;
        String lower = content.toLowerCase();
        long hits = keywords.stream().filter(lower::contains).count();
        double bonus = hits * KEYWORD_WEIGHT;
        return Math.min(bonus, MAX_KEYWORD_BONUS);
    }

    // ─── Semantic Chunking ────────────────────────────────────────────────

    private List<String> chunkSemantic(String text) {
        String[] paragraphs = text.replace("\r\n", "\n").split("\\n{2,}");
        List<String> chunks = new ArrayList<>();
        StringBuilder current = new StringBuilder();

        for (String para : paragraphs) {
            String p = para.strip();
            if (p.isEmpty()) continue;

            if (p.length() > MAX_CHUNK_CHARS) {
                if (!current.isEmpty()) {
                    chunks.add(current.toString().strip());
                    current.setLength(0);
                }
                splitWithOverlap(p, chunks);
                continue;
            }

            int addedLen = current.isEmpty() ? p.length() : current.length() + 2 + p.length();
            if (addedLen > MAX_CHUNK_CHARS && !current.isEmpty()) {
                chunks.add(current.toString().strip());
                current.setLength(0);
            }

            if (!current.isEmpty()) current.append("\n\n");
            current.append(p);
        }

        if (!current.isEmpty()) chunks.add(current.toString().strip());
        return chunks;
    }

    private void splitWithOverlap(String text, List<String> out) {
        int start = 0;
        while (start < text.length()) {
            int end = Math.min(start + MAX_CHUNK_CHARS, text.length());
            out.add(text.substring(start, end).strip());
            start += MAX_CHUNK_CHARS - CHUNK_OVERLAP;
        }
    }

    // ─── Embedding ────────────────────────────────────────────────────────

    public float[] embed(String text) throws IOException {
        return embedWithType(text, "search_document");
    }

    public float[] embedQuery(String text) throws IOException {
        return embedWithType(text, "search_query");
    }

    private float[] embedWithType(String text, String inputType) throws IOException {
        java.util.Map<String, Object> body = java.util.Map.of(
                "texts", new String[]{text},
                "model", "embed-multilingual-v3.0",
                "input_type", inputType,
                "embedding_types", new String[]{"float"}
        );

        HttpPost post = new HttpPost(cohereEmbedUrl);
        post.addHeader("Authorization", "Bearer " + cohereKey);
        post.addHeader("Content-Type", "application/json");
        post.setEntity(new StringEntity(MAPPER.writeValueAsString(body), StandardCharsets.UTF_8));

        String raw = httpClient.execute(post, response -> {
            try {
                return EntityUtils.toString(response.getEntity(), StandardCharsets.UTF_8);
            } catch (org.apache.hc.core5.http.ParseException e) {
                throw new IOException("Failed to parse Cohere response", e);
            }
        });

        JsonNode root = MAPPER.readTree(raw);
        JsonNode vector = root.path("embeddings").path("float").get(0);
        if (vector == null || vector.isMissingNode()) {
            throw new IOException("Cohere embed error: " + raw);
        }

        float[] result = new float[vector.size()];
        for (int i = 0; i < vector.size(); i++) {
            result[i] = (float) vector.get(i).asDouble();
        }
        return result;
    }

    // ─── Oracle 23ai VECTOR operations ───────────────────────────────────

    private void insertChunk(long docId, long pjId, String content, float[] embedding) throws Exception {
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "INSERT INTO rag_chunks (doc_id, pj_id, content, embedding) VALUES (?, ?, ?, ?)")) {
            ps.setLong(1, docId);
            ps.setLong(2, pjId);
            ps.setString(3, content);
            ps.setObject(4, embedding, OracleType.VECTOR);
            ps.executeUpdate();
        }
    }

    private long countChunks(long pjId) throws Exception {
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "SELECT COUNT(*) FROM rag_chunks WHERE pj_id = ?")) {
            ps.setLong(1, pjId);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? rs.getLong(1) : 0;
            }
        }
    }

    private List<String> fetchAllChunks(long pjId) throws Exception {
        List<String> results = new ArrayList<>();
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "SELECT content FROM rag_chunks WHERE pj_id = ? ORDER BY chunk_id")) {
            ps.setLong(1, pjId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) results.add(rs.getString(1));
            }
        }
        return results;
    }

    /** Fetch top CANDIDATE_K chunks within WIDE_THRESHOLD, with their cosine distances. */
    private List<ScoredChunk> fetchCandidates(float[] queryEmbedding, long pjId) throws Exception {
        List<ScoredChunk> results = new ArrayList<>();
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "SELECT content, dist FROM (" +
                     "  SELECT content, VECTOR_DISTANCE(embedding, ?, COSINE) AS dist " +
                     "  FROM rag_chunks WHERE pj_id = ? " +
                     "  ORDER BY dist FETCH FIRST ? ROWS ONLY" +
                     ") WHERE dist < ?")) {
            ps.setObject(1, queryEmbedding, OracleType.VECTOR);
            ps.setLong(2, pjId);
            ps.setInt(3, CANDIDATE_K);
            ps.setDouble(4, WIDE_THRESHOLD);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    results.add(new ScoredChunk(rs.getString(1), rs.getDouble(2)));
                }
            }
        }
        return results;
    }

    // ─── Inner types ──────────────────────────────────────────────────────

    private static class ScoredChunk {
        final String content;
        final double score;
        ScoredChunk(String content, double score) {
            this.content = content;
            this.score   = score;
        }
    }
}
