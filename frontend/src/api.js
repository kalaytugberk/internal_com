import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const http = axios.create({ baseURL: API });

export const api = {
  employees: () => http.get("/employees").then((r) => r.data),
  segmentOptions: () => http.get("/segments/options").then((r) => r.data),
  categoryTypes: () => http.get("/category-types").then((r) => r.data),

  categories: () => http.get("/categories").then((r) => r.data),
  createCategory: (d) => http.post("/categories", d).then((r) => r.data),
  updateCategory: (id, d) => http.put(`/categories/${id}`, d).then((r) => r.data),
  deleteCategory: (id) => http.delete(`/categories/${id}`).then((r) => r.data),
  reorderCategories: (ids) => http.post("/categories/reorder", { ordered_ids: ids }).then((r) => r.data),

  subcategories: (categoryId) =>
    http.get("/subcategories", { params: categoryId ? { category_id: categoryId } : {} }).then((r) => r.data),
  createSubcategory: (d) => http.post("/subcategories", d).then((r) => r.data),
  updateSubcategory: (id, d) => http.put(`/subcategories/${id}`, d).then((r) => r.data),
  deleteSubcategory: (id) => http.delete(`/subcategories/${id}`).then((r) => r.data),

  announcements: (params) => http.get("/announcements", { params }).then((r) => r.data),
  feed: (employeeId) => http.get("/announcements/feed", { params: { employee_id: employeeId } }).then((r) => r.data),
  announcement: (id) => http.get(`/announcements/${id}`).then((r) => r.data),
  createAnnouncement: (d) => http.post("/announcements", d).then((r) => r.data),
  updateAnnouncement: (id, d) => http.put(`/announcements/${id}`, d).then((r) => r.data),
  approveAnnouncement: (id) => http.post(`/announcements/${id}/approve`).then((r) => r.data),
  rejectAnnouncement: (id) => http.post(`/announcements/${id}/reject`).then((r) => r.data),
  pinAnnouncement: (id) => http.post(`/announcements/${id}/pin`).then((r) => r.data),
  deleteAnnouncement: (id) => http.delete(`/announcements/${id}`).then((r) => r.data),

  pulses: () => http.get("/pulses").then((r) => r.data),
  pulseFeed: (employeeId) => http.get("/pulses/feed", { params: { employee_id: employeeId } }).then((r) => r.data),
  pulse: (id) => http.get(`/pulses/${id}`).then((r) => r.data),
  createPulse: (d) => http.post("/pulses", d).then((r) => r.data),
  updatePulse: (id, d) => http.put(`/pulses/${id}`, d).then((r) => r.data),
  deletePulse: (id) => http.delete(`/pulses/${id}`).then((r) => r.data),
  respondPulse: (id, d) => http.post(`/pulses/${id}/respond`, d).then((r) => r.data),
  pulseReport: (id) => http.get(`/pulses/${id}/report`).then((r) => r.data),
  pulseMyHistory: (id, employeeId) => http.get(`/pulses/${id}/my-history`, { params: { employee_id: employeeId } }).then((r) => r.data),
};
