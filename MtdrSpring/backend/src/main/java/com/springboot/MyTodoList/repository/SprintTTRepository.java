package com.springboot.MyTodoList.repository;

import com.springboot.MyTodoList.model.SprintTT;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.EnableTransactionManagement;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/*
 * ============================================================
 *  Repository: SprintTTRepository
 *  Entity:     SprintTT  →  SPRINT_TT table
 * ============================================================
 *
 *  Provides CRUD for SprintTT entities.
 *  The most common read pattern is: "give me sprints for project X"
 *  or "give me the currently active sprint for project X".
 */
@Repository
@Transactional
@EnableTransactionManagement
public interface SprintTTRepository extends JpaRepository<SprintTT, Long> {

    /*
     * All sprints belonging to a given project.
     *
     * Generated SQL:
     *   SELECT * FROM sprint_tt WHERE pj_id = ?
     *
     * Use case: sprint history/timeline view for a project.
     */
    List<SprintTT> findByPjId(long pjId);

    /*
     * Sprints for a project matching specific states.
     * Use case: KPI charts excluding future/inactive sprints.
     */
    List<SprintTT> findByPjIdAndStateSprintIn(long pjId, List<String> states);

    /*
     * All sprints in a given lifecycle state across all projects.
     *
     * Generated SQL:
     *   SELECT * FROM sprint_tt WHERE state_sprint = ?
     *
     * Use case:
     *   findByStateSprint("active") → all currently running sprints (any project)
     *   findByStateSprint("done")   → all completed sprints (for reporting)
     */
    List<SprintTT> findByStateSprint(String stateSprint);

    /*
     * The currently active sprint for a specific project.
     *
     * Generated SQL:
     *   SELECT * FROM sprint_tt WHERE pj_id = ? AND state_sprint = ?
     *
     * Returns Optional because:
     *   - There may be no active sprint (between sprints).
     *   - There should never be more than one active sprint per project,
     *     but Optional forces the caller to handle the absence case safely.
     *
     * Use case: SprintTTService.getActiveSprintForProject(pjId)
     *   called with stateSprint = "active"
     */
    Optional<SprintTT> findByPjIdAndStateSprint(long pjId, String stateSprint);

    /*
     * All non-done sprints for a project except the one being closed.
     * Used by closeSprintAndActivateNext() to find the nearest next sprint.
     *
     * Generated SQL:
     *   SELECT * FROM sprint_tt
     *   WHERE pj_id = ? AND spr_id <> ? AND state_sprint <> 'done'
     */
    List<SprintTT> findByPjIdAndSprIdNotAndStateSprintNot(long pjId, long excludeId, String excludeState);

    /*
     * Active sprints whose end date is strictly before today.
     * Used by the daily scheduler to auto-close expired sprints
     * for projects with autoCloseSprints = true.
     *
     * JPQL — joins to PROJECT_TT via pjId field on SprintTT.
     */
    @Query("SELECT s FROM SprintTT s WHERE s.stateSprint = 'active' AND s.dateEndSpr < :today")
    List<SprintTT> findExpiredActiveSprints(@Param("today") LocalDate today);
}
