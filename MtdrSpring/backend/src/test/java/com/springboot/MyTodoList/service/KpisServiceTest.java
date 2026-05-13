package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.repository.KpisRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("KpisService - KPI mapping tests")
class KpisServiceTest {

    @Mock
    private KpisRepository kpisRepository;

    @InjectMocks
    private KpisService kpisService;

    @Test
    @DisplayName("Maps project velocity summary")
    void getProjectVelocityMetric_maps_summary_values() {
        when(kpisRepository.getProjectVelocityMetric(1L)).thenReturn(new Object[] { 3L, 12.5 });

        Map<String, Object> result = kpisService.getProjectVelocityMetric(1L);

        assertEquals(3L, result.get("finished_sprints"));
        assertEquals(12.5, result.get("avg_velocity"));
        verify(kpisRepository).getProjectVelocityMetric(1L);
    }

    @Test
    @DisplayName("Defaults project velocity summary when repository returns no row")
    void getProjectVelocityMetric_handles_empty_result() {
        when(kpisRepository.getProjectVelocityMetric(2L)).thenReturn(null);

        Map<String, Object> result = kpisService.getProjectVelocityMetric(2L);

        assertEquals(0, result.get("finished_sprints"));
        assertNull(result.get("avg_velocity"));
    }

    @Test
    @DisplayName("Maps sprint velocity rows")
    void getVelocityByProject_maps_rows() {
        List<Object[]> rows = java.util.Collections.singletonList(new Object[] { "Sprint 1", 4L, 21L });
        when(kpisRepository.getVelocityByProject(7L)).thenReturn(rows);

        List<Map<String, Object>> result = kpisService.getVelocityByProject(7L);

        assertEquals(1, result.size());
        assertEquals("Sprint 1", result.get(0).get("sprint"));
        assertEquals(4L, result.get(0).get("completed_tasks"));
        assertEquals(21L, result.get(0).get("weighted_points"));
    }

    @Test
    @DisplayName("Maps feature completitud rows")
    void getCompletitudByFeature_maps_rows() {
        List<Object[]> rows = java.util.Collections.singletonList(new Object[] { "Feature A", "high", 13L, 8L, 39L, 24L, 61.54 });
        when(kpisRepository.getCompletitudByFeature(5L)).thenReturn(rows);

        List<Map<String, Object>> result = kpisService.getCompletitudByFeature(5L);

        assertEquals(1, result.size());
        assertEquals("Feature A", result.get(0).get("feature"));
        assertEquals("high", result.get(0).get("feature_priority"));
        assertEquals(13L, result.get(0).get("total_sp"));
        assertEquals(8L, result.get(0).get("completed_sp"));
        assertEquals(39L, result.get(0).get("total_weight"));
        assertEquals(24L, result.get(0).get("completed_weight"));
        assertEquals(61.54, result.get(0).get("pct_weighted"));
    }
}
