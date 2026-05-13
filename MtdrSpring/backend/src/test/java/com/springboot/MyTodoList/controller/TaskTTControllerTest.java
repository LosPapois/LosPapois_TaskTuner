package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.TaskTT;
import com.springboot.MyTodoList.service.TaskTTService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TaskTTController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("TaskTTController - Task visualization tests")
class TaskTTControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TaskTTService taskTTService;

    @Test
    @DisplayName("Visualizes all tasks from web")
    void getAllTasks_returns_task_list() throws Exception {
        TaskTT task = new TaskTT(1L, "Implement login", 8, LocalDate.now(), LocalDate.now().plusDays(7), null, "high", "Auth flow", 5L, 2L, 1L);
        when(taskTTService.findAll()).thenReturn(List.of(task));

        mockMvc.perform(get("/api/tasks").accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].taskId").value(1L))
            .andExpect(jsonPath("$[0].nameTask").value("Implement login"))
            .andExpect(jsonPath("$[0].userId").value(2L));
    }

    @Test
    @DisplayName("Visualizes project tasks from web")
    void getTasksByProject_returns_project_backlog() throws Exception {
        TaskTT task = new TaskTT(2L, "Fix dashboard", 5, LocalDate.now(), LocalDate.now().plusDays(5), null, "medium", "UI fixes", 9L, 3L, 77L);
        when(taskTTService.getTasksByProject(77L)).thenReturn(List.of(task));

        mockMvc.perform(get("/api/projects/{pjId}/tasks", 77L).accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].taskId").value(2L))
            .andExpect(jsonPath("$[0].pjId").value(77L))
            .andExpect(jsonPath("$[0].nameTask").value("Fix dashboard"));
    }
}
