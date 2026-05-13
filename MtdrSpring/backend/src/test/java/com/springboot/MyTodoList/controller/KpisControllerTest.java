package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.service.KpisService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(KpisController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("KpisController - KPI visualization tests")
class KpisControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private KpisService kpisService;

    @Test
    @DisplayName("Visualizes developer KPIs for a project")
    void getVelocityByProject_returns_project_kpis() throws Exception {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("sprint", "Sprint 1");
        row.put("completed_tasks", 4L);
        row.put("weighted_points", 21L);

        when(kpisService.getVelocityByProject(10L)).thenReturn(List.of(row));

        mockMvc.perform(get("/api/projects/{pjId}/kpis/velocity", 10L).accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].sprint").value("Sprint 1"))
            .andExpect(jsonPath("$[0].completed_tasks").value(4L))
            .andExpect(jsonPath("$[0].weighted_points").value(21L));
    }

    @Test
    @DisplayName("Visualizes sprint KPI summary")
    void getProjectVelocityMetric_returns_summary() throws Exception {
        Map<String, Object> metric = new LinkedHashMap<>();
        metric.put("finished_sprints", 3);
        metric.put("avg_velocity", 12.5);

        when(kpisService.getProjectVelocityMetric(10L)).thenReturn(metric);

        mockMvc.perform(get("/api/projects/{pjId}/kpis/project-velocity", 10L).accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.finished_sprints").value(3))
            .andExpect(jsonPath("$.avg_velocity").value(12.5));
    }

    @Test
    @DisplayName("Visualizes feature KPI completion")
    void getCompletitudByFeature_returns_feature_kpis() throws Exception {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("feature", "Feature A");
        row.put("feature_priority", "high");
        row.put("total_sp", 13L);
        row.put("completed_sp", 8L);
        row.put("total_weight", 39L);
        row.put("completed_weight", 24L);
        row.put("pct_weighted", 61.54);

        when(kpisService.getCompletitudByFeature(5L)).thenReturn(List.of(row));

        mockMvc.perform(get("/api/features/{featureId}/kpis/completitud", 5L).accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].feature").value("Feature A"))
            .andExpect(jsonPath("$[0].completed_sp").value(8L))
            .andExpect(jsonPath("$[0].pct_weighted").value(61.54));
    }
}
