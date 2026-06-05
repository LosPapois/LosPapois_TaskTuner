import React from 'react';
import {
  ArrowTrendingUpIcon,
  ChevronDownIcon,
  ChartBarIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { SprintDTO } from '../../Utils/types';

export type MetricKey = 'tasksCompleted' | 'storyPointsCompleted';

interface MemberOption {
  id: number;
  name: string;
}

interface ChartRowValue {
  memberId: number;
  value: number;
}

export interface SprintChartRow {
  sprintId: number;
  sprintName: string;
  values: ChartRowValue[];
}

const METRIC_LABEL: Record<MetricKey, string> = {
  tasksCompleted: 'Tasks Completed',
  storyPointsCompleted: 'SPs Completed',
};

const BAR_COLORS = [
  '#2563EB',
  '#16A34A',
  '#EA580C',
  '#7C3AED',
  '#0891B2',
  '#DC2626',
  '#4F46E5',
  '#059669',
  '#9333EA',
  '#D97706',
];

interface SprintPerformanceChartProps {
  members: MemberOption[];
  sprints: SprintDTO[];
  pendingMemberIds: number[];
  pendingMetric: MetricKey;
  isMemberMenuOpen: boolean;
  memberMenuRef: React.RefObject<HTMLDivElement>;
  selectedMembersLabel: string;
  onToggleMemberMenu: () => void;
  onSelectAllMembers: () => void;
  onClearMembers: () => void;
  onToggleMember: (memberId: number) => void;
  onMetricChange: (metric: MetricKey) => void;
  onApply: () => void;
  appliedMemberIds: number[];
  appliedMetric: MetricKey;
  chartRows: SprintChartRow[];
  yTicks: number[];
  axisMax: number;
  barWidthPx: number;
  barGapPx: number;
  sprintGroupWidthPx: number;
  chartMinWidthPx: number;
  memberNameById: Map<number, string>;
}

export default function SprintPerformanceChart({
  members,
  sprints,
  pendingMemberIds,
  pendingMetric,
  isMemberMenuOpen,
  memberMenuRef,
  selectedMembersLabel,
  onToggleMemberMenu,
  onSelectAllMembers,
  onClearMembers,
  onToggleMember,
  onMetricChange,
  onApply,
  appliedMemberIds,
  appliedMetric,
  chartRows,
  yTicks,
  axisMax,
  barWidthPx,
  barGapPx,
  sprintGroupWidthPx,
  chartMinWidthPx,
  memberNameById,
}: SprintPerformanceChartProps) {
  return (
    <section
      className="section-card-flex space-y-6"
      aria-labelledby="statistics-controls-heading"
    >
      <div className="flex flex-col space-y-2">
        <h2 id="statistics-controls-heading" className="heading-h4">
          Bar Graph by Sprint
        </h2>
        <p className="text-sm text-gray-500">
          Configure metrics and select developers to analyze performance across sprints.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="block">
          <span className="text-sm font-semibold text-gray-700 inline-flex items-center gap-1.5 mb-2">
            <UserGroupIcon className="h-4 w-4" aria-hidden="true" />
            Team Members
          </span>
          <div ref={memberMenuRef} className="relative">
            <button
              type="button"
              onClick={onToggleMemberMenu}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left text-sm text-gray-700
                         hover:border-gray-300 focus:border-brand focus:outline-none inline-flex items-center justify-between gap-2"
            >
              <span className="truncate">{selectedMembersLabel}</span>
              <ChevronDownIcon
                className={`h-4 w-4 text-gray-500 transition-transform ${isMemberMenuOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>

            {isMemberMenuOpen && (
              <div
                className="absolute z-20 mt-2 w-full rounded-xl border border-gray-200 bg-white shadow-lg shadow-gray-200/70"
                role="menu"
                aria-label="Team members selection"
              >
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                  <button
                    type="button"
                    onClick={onSelectAllMembers}
                    className="text-xs font-semibold text-brand hover:text-brand-dark"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={onClearMembers}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </button>
                </div>

                <div className="max-h-56 overflow-auto py-1">
                  {members.map(member => {
                    const checked = pendingMemberIds.includes(member.id);
                    return (
                      <label
                        key={member.id}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => onToggleMember(member.id)}
                          className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                        />
                        <span className="truncate">{member.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">Pick one or more developers.</p>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-gray-700 inline-flex items-center gap-1.5 mb-2">
            <ArrowTrendingUpIcon className="h-4 w-4" aria-hidden="true" />
            Data to Display
          </span>
          <select
            value={pendingMetric}
            onChange={e => onMetricChange(e.target.value as MetricKey)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-brand focus:outline-none"
          >
            <option value="tasksCompleted">Tasks Completed</option>
            <option value="storyPointsCompleted">SPs Completed</option>
          </select>
        </label>

        <div className="flex items-center translate-y-0.5">
          <button
            type="button"
            onClick={onApply}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand text-white px-4 py-2.5 text-sm font-semibold hover:bg-brand-dark transition-colors"
          >
            <ChartBarIcon className="h-5 w-5" aria-hidden="true" />
            Update Graph
          </button>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-100">
        <p className="text-sm text-gray-500 mb-5">
          X axis: Sprints. Y axis: {METRIC_LABEL[appliedMetric]}.
        </p>

        {sprints.length === 0 ? (
          <p className="text-sm text-gray-400">This project has no sprints yet.</p>
        ) : appliedMemberIds.length === 0 ? (
          <p className="text-sm text-gray-400">Select at least one member and click Update Graph.</p>
        ) : (
          <div className="space-y-5">
            <div className="border border-gray-100 rounded-xl p-4 bg-gradient-to-b from-gray-50 to-white overflow-x-auto">
              <div style={{ minWidth: `${chartMinWidthPx}px` }}>
                <div className="grid grid-cols-[64px_1fr] gap-3 items-stretch">
                  <div className="relative h-80">
                    {yTicks.map((tick, idx) => {
                      const ratio = yTicks.length > 1 ? idx / (yTicks.length - 1) : 0;
                      const bottom = `${ratio * 100}%`;
                      return (
                        <span
                          key={tick}
                          className="absolute right-0 translate-y-1/2 text-xs text-gray-400"
                          style={{ bottom }}
                        >
                          {tick}
                        </span>
                      );
                    })}
                  </div>

                  <div className="relative h-80 border-l border-gray-200 pl-3">
                    {yTicks.map((tick, idx) => {
                      const ratio = yTicks.length > 1 ? idx / (yTicks.length - 1) : 0;
                      const bottom = `${ratio * 100}%`;
                      return (
                        <div
                          key={tick}
                          className="absolute left-0 right-0 border-t border-dashed border-gray-200"
                          style={{ bottom }}
                        />
                      );
                    })}

                    <div className="h-full flex items-end justify-start gap-4 pb-2">
                      {chartRows.map(row => (
                        <div
                          key={row.sprintId}
                          className="flex-none h-full flex items-end justify-center"
                          style={{
                            width: `${sprintGroupWidthPx}px`,
                            minWidth: `${sprintGroupWidthPx}px`,
                            gap: `${barGapPx}px`,
                          }}
                        >
                          {row.values.map((bar, index) => {
                            const pct = axisMax > 0 ? (bar.value / axisMax) * 100 : 0;
                            const barHeight = bar.value === 0 ? 0 : Math.max(pct, 2);
                            return (
                              <div
                                key={bar.memberId}
                                className="h-full flex items-end"
                                style={{ width: `${barWidthPx}px` }}
                              >
                                <div
                                  className="w-full rounded-t-md transition-[height] duration-500"
                                  style={{
                                    height: `${barHeight}%`,
                                    backgroundColor: BAR_COLORS[index % BAR_COLORS.length],
                                  }}
                                  title={`${memberNameById.get(bar.memberId) ?? `Member ${bar.memberId}`}: ${bar.value}`}
                                />
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-[64px_1fr] gap-3 mt-3">
                  <div aria-hidden="true" />
                  <div className="border-l border-transparent pl-3">
                    <div className="flex justify-start gap-4 mb-2">
                      {chartRows.map(row => (
                        <div
                          key={row.sprintId}
                          className="flex-none"
                          style={{
                            width: `${sprintGroupWidthPx}px`,
                            minWidth: `${sprintGroupWidthPx}px`,
                          }}
                        >
                          <div className="flex flex-wrap justify-center gap-1.5">
                            {row.values.map((v, idx) => (
                              <span
                                key={v.memberId}
                                className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-medium text-gray-700"
                              >
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: BAR_COLORS[idx % BAR_COLORS.length] }}
                                  aria-hidden="true"
                                />
                                {v.value}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-start gap-4">
                      {chartRows.map(row => (
                        <div
                          key={row.sprintId}
                          className="flex-none text-center"
                          style={{
                            width: `${sprintGroupWidthPx}px`,
                            minWidth: `${sprintGroupWidthPx}px`,
                          }}
                        >
                          <span className="inline-block text-xs font-medium text-gray-600 leading-tight">
                            {row.sprintName}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-1 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Legend</h3>
              <div className="flex flex-wrap gap-3">
                {appliedMemberIds.map((memberId, idx) => (
                  <div key={memberId} className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <span
                      className="h-3 w-3 rounded-sm"
                      style={{ backgroundColor: BAR_COLORS[idx % BAR_COLORS.length] }}
                      aria-hidden="true"
                    />
                    <span>{memberNameById.get(memberId) ?? `Member ${memberId}`}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
