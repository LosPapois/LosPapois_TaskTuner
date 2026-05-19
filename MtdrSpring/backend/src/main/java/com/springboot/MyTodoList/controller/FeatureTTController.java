package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.FeatureTT;
import com.springboot.MyTodoList.service.FeatureTTService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class FeatureTTController {

    @Autowired
    private FeatureTTService featureTTService;

    @GetMapping("/features")
    public List<FeatureTT> getAllFeatures() {
        return featureTTService.findAll();
    }

    @GetMapping("/features/{id}")
    public ResponseEntity<FeatureTT> getFeatureById(@PathVariable long id) {
        return ControllerHelper.okOrNotFound(featureTTService.getFeatureById(id));
    }

    @GetMapping("/features/sprint/{sprId}")
    public List<FeatureTT> getFeaturesBySprint(@PathVariable long sprId) {
        return featureTTService.getFeaturesBySprint(sprId);
    }

    @GetMapping("/features/{id}/story-points")
    public ResponseEntity<Long> getStoryPoints(@PathVariable long id) {
        return ResponseEntity.ok(featureTTService.getStoryPoints(id));
    }

    @PostMapping("/features")
    public ResponseEntity<FeatureTT> addFeature(@RequestBody FeatureTT feature) {
        FeatureTT saved = featureTTService.addFeature(feature);
        return ControllerHelper.created(saved, saved.getFeatureId());
    }

    @PutMapping("/features/{id}")
    public ResponseEntity<FeatureTT> updateFeature(@RequestBody FeatureTT feature, @PathVariable long id) {
        return ControllerHelper.okOrNotFound(featureTTService.updateFeature(id, feature));
    }

    @DeleteMapping("/features/{id}")
    public ResponseEntity<Boolean> deleteFeature(@PathVariable long id) {
        return ControllerHelper.deleted(featureTTService.deleteFeature(id));
    }
}
