package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.DocumentTT;
import com.springboot.MyTodoList.service.DocumentTTService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import java.net.URI;

import java.util.List;

@RestController
@RequestMapping("/api")
public class DocumentTTController {

    @Autowired
    private DocumentTTService documentTTService;

    @GetMapping(value = "/documents")
    public List<DocumentTT> getAllDocuments() {
        return documentTTService.findAll();
    }

    @GetMapping(value = "/documents/pending-embedding")
    public List<DocumentTT> getDocumentsPendingEmbedding() {
        return documentTTService.getDocumentsPendingEmbedding();
    }

    @GetMapping(value = "/documents/project/{pjId}")
    public List<DocumentTT> getDocumentsForProject(@PathVariable long pjId) {
        return documentTTService.getDocumentsForProject(pjId);
    }

    @GetMapping(value = "/documents/project/{pjId}/loaded")
    public List<DocumentTT> getLoadedDocumentsForProject(@PathVariable long pjId) {
        return documentTTService.getLoadedDocumentsForProject(pjId);
    }

    @GetMapping(value = "/documents/{id}")
    public ResponseEntity<DocumentTT> getDocumentById(@PathVariable long id) {
        return documentTTService.getDocumentById(id)
                .map(document -> new ResponseEntity<>(document, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @PostMapping(value = "/documents")
    public ResponseEntity<DocumentTT> uploadDocument(@RequestBody DocumentTT document) {
        DocumentTT saved = documentTTService.uploadDocument(document);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(saved.getDocId())
                .toUri();
        return ResponseEntity.created(location)
                .header("Access-Control-Expose-Headers", "Location")
                .body(saved);
    }

    @PutMapping(value = "/documents/{id}")
    public ResponseEntity<DocumentTT> updateDocument(@RequestBody DocumentTT document, @PathVariable long id) {
        DocumentTT updated = documentTTService.updateDocument(id, document);
        if (updated == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        return new ResponseEntity<>(updated, HttpStatus.OK);
    }

    @PatchMapping(value = "/documents/{id}/loaded")
    public ResponseEntity<DocumentTT> markDocumentAsLoaded(@PathVariable long id) {
        DocumentTT updated = documentTTService.markAsLoaded(id);
        if (updated == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        return new ResponseEntity<>(updated, HttpStatus.OK);
    }

    @DeleteMapping(value = "/documents/{id}")
    public ResponseEntity<Boolean> deleteDocument(@PathVariable long id) {
        boolean flag = documentTTService.deleteDocument(id);
        if (flag) {
            return new ResponseEntity<>(true, HttpStatus.OK);
        } else {
            return new ResponseEntity<>(false, HttpStatus.NOT_FOUND);
        }
    }
}
