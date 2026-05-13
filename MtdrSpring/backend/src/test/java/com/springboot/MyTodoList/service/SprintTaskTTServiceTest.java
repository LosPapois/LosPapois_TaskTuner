package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.SprintTaskTT;
import com.springboot.MyTodoList.model.SprintTaskKey;
import com.springboot.MyTodoList.repository.SprintTaskTTRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("SprintTaskTTService - Sprint assignment tests")
class SprintTaskTTServiceTest {

    @Mock
    private SprintTaskTTRepository sprintTaskTTRepository;

    @InjectMocks
    private SprintTaskTTService sprintTaskTTService;

    @Test
    @DisplayName("Assigns a task to a sprint")
    void addTaskToSprint_creates_active_link() {
        SprintTaskTT savedEntry = new SprintTaskTT(4L, 9L, "active");
        when(sprintTaskTTRepository.save(any())).thenReturn(savedEntry);

        SprintTaskTT result = sprintTaskTTService.addTaskToSprint(4L, 9L);

        assertNotNull(result);
        assertEquals(4L, result.getSprId());
        assertEquals(9L, result.getTaskId());
        assertEquals("active", result.getStateTask());
        verify(sprintTaskTTRepository).save(any());
    }

    @Test
    @DisplayName("Updates the sprint task state")
    void updateTaskState_changes_the_state() {
        SprintTaskTT existingEntry = new SprintTaskTT(4L, 9L, "active");
        SprintTaskKey key = new SprintTaskKey(4L, 9L);
        when(sprintTaskTTRepository.findById(key)).thenReturn(Optional.of(existingEntry));
        when(sprintTaskTTRepository.save(existingEntry)).thenAnswer(invocation -> existingEntry);

        SprintTaskTT result = sprintTaskTTService.updateTaskState(4L, 9L, "done");

        assertNotNull(result);
        assertEquals("done", result.getStateTask());
        verify(sprintTaskTTRepository).save(existingEntry);
    }

    @Test
    @DisplayName("Returns null when the sprint task link is missing")
    void updateTaskState_returns_null_when_missing() {
        when(sprintTaskTTRepository.findById(new SprintTaskKey(4L, 9L))).thenReturn(Optional.empty());

        SprintTaskTT result = sprintTaskTTService.updateTaskState(4L, 9L, "done");

        assertNull(result);
    }

    @Test
    @DisplayName("Removes a task from a sprint")
    void removeTaskFromSprint_deletes_link() {
        boolean removed = sprintTaskTTService.removeTaskFromSprint(4L, 9L);

        assertTrue(removed);
        verify(sprintTaskTTRepository).deleteById(new SprintTaskKey(4L, 9L));
    }
}
