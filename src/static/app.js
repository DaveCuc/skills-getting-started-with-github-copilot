document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>

          <div class="participants-section">
            <h5>Participants</h5>
            <ul class="participants-list" aria-live="polite"></ul>
          </div>
        `;

        // Populate participants list nicely
        const participantsListEl = activityCard.querySelector(".participants-list");
        if (Array.isArray(details.participants) && details.participants.length > 0) {
          details.participants.forEach((p) => {
            const li = document.createElement("li");
            li.className = "participant-badge";

            // participant text
            const span = document.createElement("span");
            span.className = "participant-email";
            span.textContent = p;

            // delete/unregister button
            const deleteBtn = document.createElement("button");
            deleteBtn.className = "delete-participant";
            deleteBtn.setAttribute("aria-label", `Unregister ${p} from ${name}`);
            deleteBtn.innerHTML = "&times;"; // multiplication sign as an 'x'

            // click handler for unregistering
            deleteBtn.addEventListener("click", async (evt) => {
              evt.stopPropagation();
              const ok = confirm(`Unregister ${p} from ${name}?`);
              if (!ok) return;

              try {
                const res = await fetch(
                  `/activities/${encodeURIComponent(name)}/unregister?email=${encodeURIComponent(p)}`,
                  { method: "POST" }
                );

                const result = await res.json();
                if (res.ok) {
                  // remove this participant from the list and refresh availability
                  li.remove();
                  // refresh activities to ensure counts and lists stay in sync
                  fetchActivities();
                } else {
                  alert(result.detail || "Failed to unregister participant");
                }
              } catch (error) {
                console.error("Error unregistering:", error);
                alert("Network error while unregistering participant");
              }
            });

            li.appendChild(span);
            li.appendChild(deleteBtn);
            participantsListEl.appendChild(li);
          });
        } else {
          const li = document.createElement("li");
          li.textContent = "No participants yet";
          li.className = "no-participants";
          participantsListEl.appendChild(li);
        }

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        // Preserve the base "message" class and add a status class
        messageDiv.className = "message success";
        signupForm.reset();
        // Refresh activities so the newly-registered participant appears immediately
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
