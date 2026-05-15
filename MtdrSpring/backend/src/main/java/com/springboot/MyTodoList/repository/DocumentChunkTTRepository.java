package com.springboot.MyTodoList.repository;

import com.springboot.MyTodoList.model.DocumentChunkTT;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.EnableTransactionManagement;

import java.util.List;

@Repository
@Transactional
@EnableTransactionManagement
public interface DocumentChunkTTRepository extends JpaRepository<DocumentChunkTT, Long> {

    /** All chunks for a specific document, ordered for consistent rebuild. */
    List<DocumentChunkTT> findByDocIdOrderByChunkIndex(long docId);

    /** All chunks for a project — used at startup to rebuild the Lucene index. */
    List<DocumentChunkTT> findByPjId(long pjId);

    /** All chunks across all projects — used for full index rebuild on startup. */
    List<DocumentChunkTT> findAll();

    /** Delete all chunks belonging to a document (called when document is removed). */
    void deleteByDocId(long docId);
}
