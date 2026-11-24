import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BarList, ChartCard, Kpi } from '../../../components/reports/charts';
import { useCurrentAcademicYear, useRooms, useSchoolDay, useSchoolDirectory, useSections, useTimetable } from '../../../hooks/sections';
import { countBy, percent } from '../../../utils/reports';
import { DAY_LABEL, sectionLabel, sortedDays } from '../../../utils/timetable';

/** Sections, rooms and timetable (preview data stored in this browser). */
export function TimetableReport() {
  const year = useCurrentAcademicYear();
  const sections = useSections(year.id);
  const timetable = useTimetable({ academicYear: year.id });
  const rooms = useRooms();
  const schoolDay = useSchoolDay();
  const directory = useSchoolDirectory();

  const list = useMemo(() => sections.data ?? [], [sections.data]);
  const entries = useMemo(() => timetable.data ?? [], [timetable.data]);
  const teaching = schoolDay.data?.periods.filter((p) => !p.isBreak).length ?? 0;
  const days = sortedDays(schoolDay.data?.days ?? []);
  const slots = days.length * teaching;

  const seats = list.reduce((s, x) => s + x.capacity, 0);
  const seated = list.reduce((s, x) => s + x.students.length, 0);
  const enrolled = Object.values(directory.studentsByLevel).reduce((s, l) => s + l.length, 0);
  const coverage = percent(entries.length, slots * list.length);

  const fill = list.map((s) => ({ label: sectionLabel(s), value: percent(s.students.length, s.capacity), hint: `${s.students.length} / ${s.capacity} seats` }));
  const planned = useMemo(() => {
    const counts = countBy(entries, (e) => e.section._id);
    return list.map((s) => ({ label: sectionLabel(s), value: counts.get(s._id) ?? 0, hint: `${slots - (counts.get(s._id) ?? 0)} free period(s)` }));
  }, [entries, list, slots]);
  const roomUse = useMemo(() => {
    const counts = countBy(entries, (e) => e.room?._id);
    return (rooms.data ?? []).map((r) => ({ label: r.name, value: percent(counts.get(r._id) ?? 0, slots), hint: `${counts.get(r._id) ?? 0} of ${slots} periods` }));
  }, [entries, rooms.data, slots]);
  const perDay = useMemo(() => {
    const counts = countBy(entries, (e) => e.day);
    return days.map((d) => ({ label: DAY_LABEL[d], value: counts.get(d) ?? 0 }));
  }, [entries, days]);

  const loading = sections.isLoading || timetable.isLoading || schoolDay.isLoading;

  if (!year.isLoading && !year.id) {
    return <p className="rounded-xl border border-ink-200 bg-white px-5 py-8 text-center text-[13.5px] text-ink-500">Set the current academic year in School Settings to report on sections and the timetable.</p>;
  }

  return (
    <div className="space-y-5">
      <p className="text-[12.5px] text-accent-500">Preview data: sections, rooms and the timetable are stored in this browser. <Link to="/admin/academics/sections" className="font-semibold underline">Manage sections</Link></p>
      <section aria-label="Key figures" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Sections" value={String(list.length)} sub={`${seated} seated of ${seats} seats (${percent(seated, seats)}%)`} />
        <Kpi label="Students without a section" value={list.length ? String(Math.max(enrolled - seated, 0)) : '—'} tone={list.length ? enrolled - seated > 0 ? 'warning' : 'good' : undefined} sub={list.length ? `of ${enrolled} enrolled` : 'No sections yet'} />
        <Kpi label="Timetable planned" value={`${coverage}%`} sub={`${entries.length} of ${slots * list.length} periods`} tone={list.length ? coverage >= 90 ? 'good' : coverage >= 60 ? 'warning' : 'critical' : undefined} />
        <Kpi label="Rooms" value={String(rooms.data?.length ?? 0)} sub={`${slots} teaching periods a week each`} />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard
          title="Section fill"
          description="Seats taken in each section."
          csvName="section-fill"
          isLoading={loading}
          empty={!list.length}
          table={{ columns: ['Section', 'Fill %', 'Students', 'Capacity'], rows: list.map((s) => [sectionLabel(s), percent(s.students.length, s.capacity), s.students.length, s.capacity]) }}>

          <BarList data={fill} max={100} format={(n) => `${n}%`} sort={false} />
        </ChartCard>

        <ChartCard
          title="Periods planned per section"
          description={`Out of ${slots} teaching periods a week.`}
          csvName="periods-per-section"
          isLoading={loading}
          empty={!list.length}
          table={{ columns: ['Section', 'Periods planned', 'Free'], rows: planned.map((d) => [d.label, d.value, slots - d.value]) }}>

          <BarList data={planned} max={slots || undefined} sort={false} />
        </ChartCard>

        <ChartCard
          title="Room usage"
          description="Share of the week each room is booked."
          csvName="room-usage"
          isLoading={loading || rooms.isLoading}
          empty={!(rooms.data ?? []).length}
          table={{ columns: ['Room', 'Usage %'], rows: roomUse.map((d) => [d.label, d.value]) }}>

          <BarList data={roomUse} max={100} format={(n) => `${n}%`} />
        </ChartCard>

        <ChartCard
          title="Lessons per day"
          description="All sections together."
          csvName="lessons-per-day"
          isLoading={loading}
          empty={!entries.length}
          table={{ columns: ['Day', 'Lessons'], rows: perDay.map((d) => [d.label, d.value]) }}>

          <BarList data={perDay} sort={false} />
        </ChartCard>
      </div>
    </div>);

}
