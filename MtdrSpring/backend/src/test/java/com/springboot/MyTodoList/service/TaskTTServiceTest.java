package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.TaskTT;
import com.springboot.MyTodoList.repository.ProjectUserTTRepository;
import com.springboot.MyTodoList.repository.TaskTTRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("TaskTTService - Task lifecycle tests")
@SuppressWarnings("null")
class TaskTTServiceTest {

    @Mock
    private TaskTTRepository taskTTRepository;

    @Mock
    private ProjectUserTTRepository projectUserTTRepository;

    @InjectMocks
    private TaskTTService taskTTService;

    private TaskTT baseTask;

    @BeforeEach
    void setUp() {
        baseTask = new TaskTT();
        baseTask.setNameTask("Add Login Feature");
        baseTask.setInfoTask("Implement user authentication with JWT tokens");
        baseTask.setStoryPoints(8);
        baseTask.setDateStartTask(LocalDate.now());
        baseTask.setDateEndSetTask(LocalDate.now().plusDays(14));
        baseTask.setPriority("HIGH");
        baseTask.setFeatureId(1L);
        baseTask.setUserId(1L);
        baseTask.setPjId(1L);
    }

    @Test
    @DisplayName("Adds a new task")
    void addTask_saves_the_new_task() {
        TaskTT savedTask = new TaskTT(
            1L,
            baseTask.getNameTask(),
            baseTask.getStoryPoints(),
            baseTask.getDateStartTask(),
            baseTask.getDateEndSetTask(),
            null,
            baseTask.getPriority(),
            baseTask.getInfoTask(),
            baseTask.getFeatureId(),
            baseTask.getUserId(),
            baseTask.getPjId()
        );

        when(taskTTRepository.save(any())).thenReturn(savedTask);

        TaskTT result = taskTTService.addTask(baseTask);

        assertNotNull(result);
        assertEquals(1L, result.getTaskId());
        assertEquals("Add Login Feature", result.getNameTask());
        assertEquals(8, result.getStoryPoints());
        assertEquals("HIGH", result.getPriority());
        verify(taskTTRepository).save(any());
    }

    @Test
    @DisplayName("Edits an existing task")
    void updateTask_updates_mutable_fields() {
        TaskTT existingTask = new TaskTT(
            10L,
            "Old Name",
            3,
            LocalDate.of(2025, 1, 1),
            LocalDate.of(2025, 1, 7),
            null,
            "LOW",
            "Old info",
            11L,
            7L,
            1L
        );

        TaskTT updatedTask = new TaskTT(
            0L,
            "New Name",
            13,
            LocalDate.of(2025, 2, 1),
            LocalDate.of(2025, 2, 15),
            LocalDate.of(2025, 2, 16),
            "HIGH",
            "New info",
            22L,
            44L,
            1L
        );

        when(taskTTRepository.findById(10L)).thenReturn(Optional.of(existingTask));
        when(taskTTRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        TaskTT result = taskTTService.updateTask(10L, updatedTask);

        assertNotNull(result);
        assertEquals("New Name", result.getNameTask());
        assertEquals(13, result.getStoryPoints());
        assertEquals(LocalDate.of(2025, 2, 1), result.getDateStartTask());
        assertEquals(LocalDate.of(2025, 2, 15), result.getDateEndSetTask());
        assertEquals(LocalDate.of(2025, 2, 16), result.getDateEndRealTask());
        assertEquals("HIGH", result.getPriority());
        assertEquals(22L, result.getFeatureId());
        assertEquals(44L, result.getUserId());
        verify(taskTTRepository).save(any());
    }

    @Test
    @DisplayName("Returns null when editing a missing task")
    void updateTask_returns_null_when_task_is_missing() {
        when(taskTTRepository.findById(10L)).thenReturn(Optional.empty());

        TaskTT result = taskTTService.updateTask(10L, baseTask);

        assertNull(result);
        verify(taskTTRepository).findById(10L);
        verify(taskTTRepository, never()).save(any());
    }

    @Test
    @DisplayName("Deletes a task")
    void deleteTask_deletes_by_id() {
        boolean result = taskTTService.deleteTask(21L);

        assertEquals(true, result);
        verify(taskTTRepository).deleteById(21L);
    }

    @Test
    @DisplayName("Assigns a task to a user inside the same project")
    void safeAssignTask_reassigns_task_when_user_belongs_to_project() {
        TaskTT existingTask = new TaskTT(
            33L,
            "Backend API Enhancement",
            8,
            LocalDate.now(),
            LocalDate.now().plusDays(14),
            null,
            "HIGH",
            "Add caching",
            5L,
            3L,
            99L
        );

        when(taskTTRepository.findById(33L)).thenReturn(Optional.of(existingTask));
        when(projectUserTTRepository.existsByIdPjIdAndIdUserId(99L, 77L)).thenReturn(true);
        when(taskTTRepository.save(existingTask)).thenAnswer(invocation -> existingTask);

        TaskTT result = taskTTService.safeAssignTask(33L, 77L);

        assertNotNull(result);
        assertEquals(77L, result.getUserId());
        verify(projectUserTTRepository).existsByIdPjIdAndIdUserId(99L, 77L);
        verify(taskTTRepository).save(any());
    }

    @Test
    @DisplayName("Rejects assignment when the target user is outside the project")
    void safeAssignTask_rejects_users_not_in_project() {
        TaskTT existingTask = new TaskTT(
            33L,
            "Backend API Enhancement",
            8,
            LocalDate.now(),
            LocalDate.now().plusDays(14),
            null,
            "HIGH",
            "Add caching",
            5L,
            3L,
            99L
        );

        when(taskTTRepository.findById(33L)).thenReturn(Optional.of(existingTask));
        when(projectUserTTRepository.existsByIdPjIdAndIdUserId(99L, 77L)).thenReturn(false);

        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> taskTTService.safeAssignTask(33L, 77L)
        );

        assertEquals(
            "User 77 is not a member of project 99. Cannot assign task 33.",
            exception.getMessage()
        );
        verify(taskTTRepository, never()).save(any());
    }

    @Test
    @DisplayName("Rejects assignment when the task does not exist")
    void safeAssignTask_rejects_missing_task() {
        when(taskTTRepository.findById(99L)).thenReturn(Optional.empty());

        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> taskTTService.safeAssignTask(99L, 77L)
        );

        assertEquals("Task not found with id: 99", exception.getMessage());
        verify(taskTTRepository).findById(99L);
        verify(projectUserTTRepository, never()).existsByIdPjIdAndIdUserId(1L, 77L);
    }

}
