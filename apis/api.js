//export const host = "http://localhost:3000"; //Development
import { Platform } from "react-native";

// ✅ Correct Syntax: Use a ternary operator
// export const host = Platform.OS === "android"
//     ? "http://10.0.2.2:3000"
//     : "http://localhost:3000";
//export const host = "http://172.16.30.42:3000";
//export const host = "http://10.0.2.2:3000"; //Production
//OM BACKEND LINK:-
//export const host = "https://ngo-attendance-app-server.onrender.com"; //Production

//GCS BACKEND OLD:-
//export const host = "https://ngo-attendance-backend.el.r.appspot.com"; //Production

//GCS BACKEND LINK LATEST - ( ngo backend stg )
export const host = "https://ngo-attendance-server-946934634800.asia-south1.run.app";


//login auth apis
export const auth_host = `${host}/api/v1/auth`;
export const registerAdmin = `${auth_host}/register/admin`
export const loginAPI = `${auth_host}/login`;
export const logoutAPI = `${auth_host}/logout`;
export const getNgoBranchesPublicAPI = (ngoId) => `${auth_host}/ngo/${ngoId}/branches`;

//Admin features apis
export const admin_host = `${host}/api/v1/admin`;
export const addCollegeAPI = `${admin_host}/add-college`;
export const addNgoAPI = `${admin_host}/add-ngo`;

//NGO features apis
export const ngo_host = `${host}/api/v1/ngo`;
export const getAllNgoAPI = `${ngo_host}/get-all-ngos`; //get list of all registered ngos
export const eventAllAPI = `${ngo_host}/events`; //get events, add events, update events, delete events
export const attendanceAPI = `${ngo_host}/event/mark-attendance`; //marking attendance -POST req
export const addNgoVolunteerAPI = `${ngo_host}/volunteers`; //add NGO volunteers

//Branch management apis
export const createBranchAPI = `${ngo_host}/branches`; // POST
export const getAllBranchesAPI = `${ngo_host}/branches`; // GET ?ngo_id=
export const getBranchDetailsAPI = (branchId) => `${ngo_host}/branches/${branchId}`; // GET
export const updateBranchAPI = (branchId) => `${ngo_host}/branches/${branchId}`; // PUT
export const deactivateBranchAPI = (branchId) => `${ngo_host}/branches/${branchId}/deactivate`; // PATCH
export const resetBranchPasswordAPI = (branchId) => `${ngo_host}/branches/${branchId}/reset-password`; // POST
export const getBranchEventsAPI = (branchId) => `${ngo_host}/branches/${branchId}/events`; // GET
export const getBranchInternshipsAPI = (branchId) => `${ngo_host}/branches/${branchId}/internships`; // GET

//College features apis
export const college_host = `${host}/api/v1/college`;
export const addClassAPI = `${college_host}/classes`; //add new class
export const addStudentAPI = `${college_host}/students`; //add new students under particular class ID
export const getAllCollegeAPI = `${college_host}/get-all-colleges`; //get list of all registered colleges
export const updateStudentAPI = `${college_host}/students`; //update existing student data api
export const updateClassAPI = `${college_host}/classes`; //update existing class data api

//Student features apis
export const student_host = `${host}/api/v1/student`;
export const studentEventsAPI = `${host}/api/v1/student/events`; //get all available events
export const studentRegisterEventAPI = `${host}/api/v1/student/register-event`; //register for an event
export const studentMyEventsAPI = `${host}/api/v1/student/my-events`; //get student's registered events with status

//ngo registered students api
export const ngoRegisteredStudentsAPI = (eventId) => `${ngo_host}/events/${eventId}/registered-students`; //get student's registered events with status

// ─── Internship APIs ─────────────────────────────────────────────────────────
// NGO side
export const ngoInternshipsAPI = `${ngo_host}/internships`;
export const ngoInternshipApplicantsAPI = (internshipId) =>
    `${ngo_host}/internships/${internshipId}/applicants`;
export const ngoUpdateApplicantStatusAPI = (internshipId, studentId) =>
    `${ngo_host}/internships/${internshipId}/applicants/${studentId}`;
export const ngoInternshipWorkLogsAPI = (internshipId, studentId) =>
    `${ngo_host}/internships/${internshipId}/applicants/${studentId}/work-logs`;
export const ngoUpdateInternshipSettingsAPI = (internshipId) =>
    `${ngo_host}/internships/${internshipId}/update-settings`;

// Student side
export const studentInternshipsAPI = `${student_host}/internships`;
export const studentApplyInternshipAPI = (internshipId) =>
    `${student_host}/internships/${internshipId}/apply`;
export const studentMyInternshipsAPI = `${student_host}/my-internships`;
export const studentSubmitWorkLogAPI = (internshipId) =>
    `${student_host}/internships/${internshipId}/work-log`;
export const studentWorkLogsAPI = (internshipId) =>
    `${student_host}/internships/${internshipId}/work-logs`;
// Privacy Policy URL
export const privacyPolicyURL = "https://ngo-website-1-d3az.onrender.com/privacy-policy";
