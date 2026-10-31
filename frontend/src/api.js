
const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

export async function apiRequest(
  endpoint,
  { method = "GET", body, token } = {}
) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Token ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    ...(body !== undefined
      ? { body: JSON.stringify(body) }
      : {}),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data.detail ||
      Object.values(data)
        .flat()
        .find((value) => typeof value === "string") ||
      "Something went wrong. Please try again.";

    throw new Error(message);
  }

  return data;
}

// Authentication
export function registerUser(userData) {
  return apiRequest("/auth/register/", {
    method: "POST",
    body: userData,
  });
}

export function loginUser(credentials) {
  return apiRequest("/auth/login/", {
    method: "POST",
    body: credentials,
  });
}

export function logoutUser(token) {
  return apiRequest("/auth/logout/", {
    method: "POST",
    token,
  });
}

// Job applications
export function getApplications(token) {
  return apiRequest("/jobs/applications/", { token });
}

// Resumes
export function getResumes(token) {
  return apiRequest("/resumes/", { token });
}

export async function uploadResume(formData, token) {
  const response = await fetch(`${API_BASE_URL}/resumes/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
    },
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      data.detail ||
      Object.values(data)
        .flat()
        .find((value) => typeof value === "string") ||
      "Failed to upload resume.";
    throw new Error(message);
  }
  return data;
}

export function deleteResume(id, token) {
  return apiRequest(`/resumes/${id}/`, {
    method: "DELETE",
    token,
  });
}

// Job Descriptions
export function getJobDescriptions(token) {
  return apiRequest("/analyses/", { token });
}

export function createJobDescription(data, token) {
  return apiRequest("/analyses/", {
    method: "POST",
    body: data,
    token,
  });
}

export function deleteJobDescription(id, token) {
  return apiRequest(`/analyses/${id}/`, {
    method: "DELETE",
    token,
  });
}

// Resume & Job Matching
export function matchResumeJob(resumeId, jobDescriptionId, token) {
  return apiRequest("/analyses/match/", {
    method: "POST",
    body: {
      resume_id: resumeId,
      job_description_id: jobDescriptionId,
    },
    token,
  });
}


export function getApplicationActivities(applicationId, token) {
  return apiRequest(
    `/jobs/applications/${applicationId}/activities/`,
    {
      method: "GET",
      token,
    }
  );
}


export function getRecentActivities(token) {
  return apiRequest("/jobs/activities/recent/", {
    method: "GET",
    token,
  });
}


export function addApplicationActivity(applicationId, description, token) {
  return apiRequest(
    `/jobs/applications/${applicationId}/activities/add/`,
    {
      method: "POST",
      body: { description },
      token,
    }
  );
}


export function createApplication(applicationData, token) {
  return apiRequest("/jobs/applications/", {
    method: "POST",
    body: applicationData,
    token,
  });
}

export function updateApplication(id, applicationData, token) {
  return apiRequest(`/jobs/applications/${id}/`, {
    method: "PATCH",
    body: applicationData,
    token,
  });
}

export function deleteApplication(id, token) {
  return apiRequest(`/jobs/applications/${id}/`, {
    method: "DELETE",
    token,
  });
}
