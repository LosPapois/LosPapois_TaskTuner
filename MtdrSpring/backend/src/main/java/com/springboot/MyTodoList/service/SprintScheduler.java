package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.ProjectTT;
import com.springboot.MyTodoList.model.SprintTT;
import com.springboot.MyTodoList.repository.ProjectTTRepository;
import com.springboot.MyTodoList.repository.SprintTTRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * ============================================================
 *  SprintScheduler
 * ============================================================
 *
 *  Runs daily at midnight to auto-close expired sprints for
 *  projects that have autoCloseSprints = true.
 *
 *  "Expired" means: stateSprint = 'active' AND dateEndSpr < today.
 *
 *  For each expired sprint it delegates to
 *  SprintTTService.closeSprintAndActivateNext(), which:
 *    - marks the sprint as 'done'
 *    - activates the nearest next sprint (by dateStartSpr proximity)
 *    - rolls over incomplete tasks if the project also has autoRollover=true
 *
 *  The cron expression "0 0 0 * * *" fires at 00:00:00 server time every day.
 *  In production, server time should be set to the team's timezone (e.g. UTC-6
 *  for Mexico City) or use a ZonedSchedulingConfigurer bean.
 */
@Component
public class SprintScheduler {

    private static final Logger log = LoggerFactory.getLogger(SprintScheduler.class);

    @Autowired
    private SprintTTRepository sprintTTRepository;

    @Autowired
    private ProjectTTRepository projectTTRepository;

    @Autowired
    private SprintTTService sprintTTService;

    /**
     * Daily job — fires at midnight every day.
     *
     * For every active sprint whose end date is in the past, check if
     * its parent project has autoCloseSprints enabled. If yes, close it
     * and activate the nearest next sprint.
     */
    @Scheduled(cron = "0 0 0 * * *")
    public void autoCloseExpiredSprints() {
        LocalDate today = LocalDate.now();
        List<SprintTT> expired = sprintTTRepository.findExpiredActiveSprints(today);

        if (expired.isEmpty()) {
            log.debug("SprintScheduler: no expired active sprints found for {}", today);
            return;
        }

        log.info("SprintScheduler: found {} expired sprint(s) to evaluate on {}", expired.size(), today);

        for (SprintTT sprint : expired) {
            Optional<ProjectTT> projectOpt = projectTTRepository.findById(sprint.getPjId());
            if (projectOpt.isEmpty()) {
                log.warn("SprintScheduler: sprint {} references missing project {}", sprint.getSprId(), sprint.getPjId());
                continue;
            }

            ProjectTT project = projectOpt.get();
            if (!project.isAutoCloseSprints()) {
                log.debug("SprintScheduler: skipping sprint {} — project {} has autoCloseSprints=false",
                        sprint.getSprId(), project.getNamePj());
                continue;
            }

            try {
                SprintTT next = sprintTTService.closeSprintAndActivateNext(sprint.getSprId());
                if (next != null) {
                    log.info("SprintScheduler: closed sprint '{}' (id={}) → activated '{}' (id={}) for project '{}'",
                            sprint.getNameSprint(), sprint.getSprId(),
                            next.getNameSprint(), next.getSprId(),
                            project.getNamePj());
                } else {
                    log.info("SprintScheduler: closed sprint '{}' (id={}) for project '{}' — no next sprint found",
                            sprint.getNameSprint(), sprint.getSprId(), project.getNamePj());
                }
            } catch (Exception e) {
                log.error("SprintScheduler: failed to close sprint {} — {}", sprint.getSprId(), e.getMessage(), e);
            }
        }
    }
}
