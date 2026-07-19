# 1. Context Diagram (Level 0)

## Purpose

This context diagram provides a high-level view of the PIAT School Management System and its interaction with the main external users of the system.

## System Boundary

The system boundary encloses the complete web-based school management platform used by PIAT for student administration, enrollment, academic tracking, and reporting.

```mermaid
flowchart LR
    Admin[Administrator] -->|Manage user accounts<br/>Manage academic year<br/>Manage semester<br/>Manage programs<br/>Manage sections<br/>View reports<br/>Receive system statistics| System[PIAT School Management System]

    Registrar[Registrar] -->|Manage student records<br/>Manage subject offerings<br/>Manage enrollment<br/>Manage re-enrollment<br/>Assign faculty<br/>View academic records| System

    Faculty[Faculty] -->|View assigned subjects<br/>Manage attendance<br/>Encode grades<br/>View class lists| System

    Student[Student] -->|Login<br/>Complete registration form<br/>View dashboard<br/>View grades<br/>View attendance<br/>View schedule<br/>View academic history<br/>Receive notifications| System

    System -->|System statistics<br/>Account status<br/>Academic updates<br/>Notifications| Admin
    System -->|Student and academic records<br/>Enrollment status<br/>Subject schedules<br/>Reports| Registrar
    System -->|Assigned class information<br/>Attendance and grade updates| Faculty
    System -->|Dashboard data<br/>Academic performance<br/>Attendance and schedules<br/>Notifications| Student
```

## Interpretation

- The system is the single central process that receives and processes requests from four major user groups.
- The flows shown represent the major functions of the PIAT School Management System in a concise academic context diagram.
- The diagram intentionally excludes internal data processing details and focuses only on external interaction.
