import { sqliteTable, integer, real, text } from "drizzle-orm/sqlite-core";

export const course = sqliteTable("course", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
});

export const test = sqliteTable("test", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  courseId: integer("course_id").notNull(),
  name: text("name").notNull(),
  curveType: text("curve_type").notNull().default("none"),
  curveValue: real("curve_value").notNull().default(0),
  kind: text("kind").notNull().default("standard"),
  mcqTotal: integer("mcq_total").notNull().default(0),
});

export const question = sqliteTable("question", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  testId: integer("test_id").notNull(),
  number: integer("number").notNull(),
});

// A question with no lettered parts has a single part with label "".
export const part = sqliteTable("part", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  questionId: integer("question_id").notNull(),
  label: text("label").notNull().default(""),
});

export const point = sqliteTable("point", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  partId: integer("part_id").notNull(),
  position: integer("position").notNull(),
  description: text("description").notNull().default(""),
  topicId: integer("topic_id"),
});

export const reason = sqliteTable("reason", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pointId: integer("point_id").notNull(),
  position: integer("position").notNull(),
  text: text("text").notNull(),
});

export const section = sqliteTable("section", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
});

export const student = sqliteTable("student", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sectionId: integer("section_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
});

export const unit = sqliteTable("unit", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  courseId: integer("course_id").notNull(),
  number: integer("number").notNull(),
  title: text("title").notNull(),
});

export const topic = sqliteTable("topic", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  unitId: integer("unit_id").notNull(),
  position: integer("position").notNull(),
  code: text("code").notNull().default(""),
  title: text("title").notNull(),
});
