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
  pulseCompare: (id, params) => http.get(`/pulses/${id}/compare`, { params }).then((r) => r.data),

  events: () => http.get("/events").then((r) => r.data),
  eventFeed: (employeeId) => http.get("/events/feed", { params: { employee_id: employeeId } }).then((r) => r.data),
  event: (id, employeeId) => http.get(`/events/${id}`, { params: employeeId ? { employee_id: employeeId } : {} }).then((r) => r.data),
  createEvent: (d) => http.post("/events", d).then((r) => r.data),
  updateEvent: (id, d) => http.put(`/events/${id}`, d).then((r) => r.data),
  deleteEvent: (id) => http.delete(`/events/${id}`).then((r) => r.data),
  rsvpEvent: (id, d) => http.post(`/events/${id}/rsvp`, d).then((r) => r.data),
  eventReport: (id) => http.get(`/events/${id}/report`).then((r) => r.data),

  moodConfig: () => http.get("/mood/config").then((r) => r.data),
  updateMoodConfig: (d) => http.put("/mood/config", d).then((r) => r.data),
  moodToday: (employeeId) => http.get("/mood/today", { params: { employee_id: employeeId } }).then((r) => r.data),
  submitMood: (d) => http.post("/mood/entry", d).then((r) => r.data),
  moodMyHistory: (employeeId) => http.get("/mood/my-history", { params: { employee_id: employeeId } }).then((r) => r.data),
  moodReport: (department) => http.get("/mood/report", { params: department ? { department } : {} }).then((r) => r.data),

  listingsConfig: () => http.get("/listings/config").then((r) => r.data),
  updateListingsConfig: (d) => http.put("/listings/config", d).then((r) => r.data),
  listings: (params) => http.get("/listings", { params }).then((r) => r.data),
  listingsFeed: (employeeId, type) => http.get("/listings/feed", { params: { employee_id: employeeId, ...(type ? { type } : {}) } }).then((r) => r.data),
  myListings: (employeeId) => http.get("/listings/mine", { params: { employee_id: employeeId } }).then((r) => r.data),
  listing: (id) => http.get(`/listings/${id}`).then((r) => r.data),
  createListing: (d) => http.post("/listings", d).then((r) => r.data),
  approveListing: (id) => http.post(`/listings/${id}/approve`).then((r) => r.data),
  rejectListing: (id) => http.post(`/listings/${id}/reject`).then((r) => r.data),
  closeListing: (id) => http.post(`/listings/${id}/close`).then((r) => r.data),
  deleteListing: (id) => http.delete(`/listings/${id}`).then((r) => r.data),

  avatarConfig: () => http.get("/avatar/config").then((r) => r.data),
  concepts: () => http.get("/avatar/concepts").then((r) => r.data),
  createConcept: (d) => http.post("/avatar/concepts", d).then((r) => r.data),
  updateConcept: (id, d) => http.put(`/avatar/concepts/${id}`, d).then((r) => r.data),
  deleteConcept: (id) => http.delete(`/avatar/concepts/${id}`).then((r) => r.data),
  addAvatar: (id) => http.post(`/avatar/concepts/${id}/add`).then((r) => r.data),
  removeAvatar: (id, avatar) => http.post(`/avatar/concepts/${id}/remove`, { avatar }).then((r) => r.data),
  conceptsFeed: (employeeId) => http.get("/avatar/concepts/feed", { params: { employee_id: employeeId } }).then((r) => r.data),
  selectAvatar: (d) => http.post("/avatar/select", d).then((r) => r.data),
  avatarReport: () => http.get("/avatar/report").then((r) => r.data),

  routes: () => http.get("/routes").then((r) => r.data),
  routesFeed: (employeeId, city) => http.get("/routes/feed", { params: { employee_id: employeeId, ...(city ? { city } : {}) } }).then((r) => r.data),
  routeCities: () => http.get("/routes/cities").then((r) => r.data),
  route: (id, employeeId) => http.get(`/routes/${id}`, { params: employeeId ? { employee_id: employeeId } : {} }).then((r) => r.data),
  createRoute: (d) => http.post("/routes", d).then((r) => r.data),
  updateRoute: (id, d) => http.put(`/routes/${id}`, d).then((r) => r.data),
  deleteRoute: (id) => http.delete(`/routes/${id}`).then((r) => r.data),
  registerRoute: (id, d) => http.post(`/routes/${id}/register`, d).then((r) => r.data),
  unregisterRoute: (id, d) => http.post(`/routes/${id}/unregister`, d).then((r) => r.data),
  routesReport: () => http.get("/routes/report").then((r) => r.data),

  audiences: () => http.get("/audiences").then((r) => r.data),
  createAudience: (d) => http.post("/audiences", d).then((r) => r.data),
  updateAudience: (id, d) => http.put(`/audiences/${id}`, d).then((r) => r.data),
  deleteAudience: (id) => http.delete(`/audiences/${id}`).then((r) => r.data),
  previewAudience: (d) => http.post("/audiences/preview", d).then((r) => r.data),

  notifications: (kind) => http.get("/notifications", { params: { kind } }).then((r) => r.data),
  createNotification: (d) => http.post("/notifications", d).then((r) => r.data),
  notificationsFeed: (employeeId) => http.get("/notifications/feed", { params: { employee_id: employeeId } }).then((r) => r.data),
  respondNotification: (id, d) => http.post(`/notifications/${id}/respond`, d).then((r) => r.data),
  notificationReport: (id) => http.get(`/notifications/${id}/report`).then((r) => r.data),
  deleteNotification: (id) => http.delete(`/notifications/${id}`).then((r) => r.data),
};
