package com.springboot.MyTodoList.service;

import java.io.IOException;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

import org.apache.lucene.analysis.standard.StandardAnalyzer;
import org.apache.lucene.document.Document;
import org.apache.lucene.document.Field;
import org.apache.lucene.document.LongPoint;
import org.apache.lucene.document.StoredField;
import org.apache.lucene.document.StringField;
import org.apache.lucene.document.TextField;
import org.apache.lucene.index.DirectoryReader;
import org.apache.lucene.index.IndexWriter;
import org.apache.lucene.index.IndexWriterConfig;
import org.apache.lucene.index.Term;
import org.apache.lucene.queryparser.classic.MultiFieldQueryParser;
import org.apache.lucene.queryparser.classic.ParseException;
import org.apache.lucene.search.BooleanClause;
import org.apache.lucene.search.BooleanQuery;
import org.apache.lucene.search.IndexSearcher;
import org.apache.lucene.search.Query;
import org.apache.lucene.search.ScoreDoc;
import org.apache.lucene.search.TermQuery;
import org.apache.lucene.search.TopDocs;
import org.apache.lucene.store.FSDirectory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * BM25-based full-text search index for RAG.
 * One shared FSDirectory per project under {rag.index.path}/{projectId}/.
 * Lucene 9.x uses BM25Similarity by default.
 */
@Service
public class LuceneService {

    private static final Logger logger = LoggerFactory.getLogger(LuceneService.class);

    private static final String FIELD_PROJECT_ID = "projectId";
    private static final String FIELD_DOC_ID     = "docId";
    private static final String FIELD_DOC_NAME   = "docName";
    private static final String FIELD_CHUNK      = "chunk";

    @Value("${rag.index.path:/tmp/rag-index}")
    private String indexBasePath;

    /**
     * Index a list of text chunks for a document.
     * Safe to call multiple times — existing chunks for same docId are deleted first.
     */
    public void indexChunks(long projectId, long docId, String docName, List<String> chunks) {
        try (FSDirectory dir = FSDirectory.open(Paths.get(indexBasePath, String.valueOf(projectId)));
             StandardAnalyzer analyzer = new StandardAnalyzer();
             IndexWriter writer = new IndexWriter(dir, new IndexWriterConfig(analyzer))) {

            // Delete existing chunks for this doc to allow re-indexing
            writer.deleteDocuments(new Term(FIELD_DOC_ID, String.valueOf(docId)));

            for (String chunk : chunks) {
                Document doc = new Document();
                doc.add(new StringField(FIELD_PROJECT_ID, String.valueOf(projectId), Field.Store.YES));
                doc.add(new StringField(FIELD_DOC_ID,     String.valueOf(docId),     Field.Store.YES));
                doc.add(new StoredField(FIELD_DOC_NAME,   docName));
                doc.add(new TextField(FIELD_CHUNK,        chunk,                      Field.Store.YES));
                // LongPoint for numeric range filter (not used in search but kept for future use)
                doc.add(new LongPoint("projectIdNum", projectId));
                writer.addDocument(doc);
            }

            writer.commit();
            logger.info("Indexed {} chunks for docId={} projectId={}", chunks.size(), docId, projectId);
        } catch (IOException e) {
            logger.error("Lucene index write failed for projectId={} docId={}: {}", projectId, docId, e.getMessage(), e);
        }
    }

    /**
     * BM25 search: return top-K chunk texts for a project matching the query.
     * Returns empty list if no index exists or query fails.
     */
    public List<String> search(long projectId, String queryText, int topK) {
        List<String> results = new ArrayList<>();
        java.nio.file.Path indexPath = Paths.get(indexBasePath, String.valueOf(projectId));

        if (!indexPath.toFile().exists()) {
            return results;
        }

        try (FSDirectory dir = FSDirectory.open(indexPath);
             StandardAnalyzer analyzer = new StandardAnalyzer()) {

            if (!DirectoryReader.indexExists(dir)) {
                return results;
            }

            try (DirectoryReader reader = DirectoryReader.open(dir)) {
                IndexSearcher searcher = new IndexSearcher(reader);

                // BM25 over chunk field, filtered to this project
                Query chunkQuery = new MultiFieldQueryParser(
                    new String[]{FIELD_CHUNK}, analyzer
                ).parse(MultiFieldQueryParser.escape(queryText));

                Query projectFilter = new TermQuery(new Term(FIELD_PROJECT_ID, String.valueOf(projectId)));

                Query combined = new BooleanQuery.Builder()
                    .add(projectFilter, BooleanClause.Occur.FILTER)
                    .add(chunkQuery,    BooleanClause.Occur.MUST)
                    .build();

                TopDocs hits = searcher.search(combined, topK);
                for (ScoreDoc sd : hits.scoreDocs) {
                    Document doc = searcher.storedFields().document(sd.doc);
                    String chunk = doc.get(FIELD_CHUNK);
                    String name  = doc.get(FIELD_DOC_NAME);
                    if (chunk != null) {
                        results.add("[" + name + "]\n" + chunk);
                    }
                }
            }
        } catch (IOException | ParseException e) {
            logger.warn("Lucene search failed for projectId={}: {}", projectId, e.getMessage());
        }

        return results;
    }

    /**
     * Remove all indexed chunks for a document (called on document deletion).
     */
    public void deleteDocument(long projectId, long docId) {
        java.nio.file.Path indexPath = Paths.get(indexBasePath, String.valueOf(projectId));
        if (!indexPath.toFile().exists()) return;

        try (FSDirectory dir = FSDirectory.open(indexPath);
             StandardAnalyzer analyzer = new StandardAnalyzer();
             IndexWriter writer = new IndexWriter(dir, new IndexWriterConfig(analyzer))) {

            writer.deleteDocuments(new Term(FIELD_DOC_ID, String.valueOf(docId)));
            writer.commit();
        } catch (IOException e) {
            logger.error("Lucene delete failed for docId={}: {}", docId, e.getMessage(), e);
        }
    }
}
