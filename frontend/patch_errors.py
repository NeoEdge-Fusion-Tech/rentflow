with open("src/pages/Bookings.tsx", "r") as f:
    content = f.read()

helper = """
const extractErrorMessage = (e: any, defaultMsg = "An error occurred") => {
  if (!e.response?.data) return defaultMsg;
  const data = e.response.data;

  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  if (data.non_field_errors?.[0]) return data.non_field_errors[0];

  const keys = Object.keys(data);
  if (keys.length > 0) {
    const firstError = data[keys[0]];
    const fieldName = keys[0].replace(/_/g, ' ').toUpperCase();
    if (Array.isArray(firstError)) return `${fieldName}: ${firstError[0]}`;
    if (typeof firstError === "string") return `${fieldName}: ${firstError}`;
  }

  return defaultMsg;
};

export function Bookings() {
"""

content = content.replace("export function Bookings() {", helper)

content = content.replace(
    """      const errorMsg =
        e.response?.data?.non_field_errors?.[0] ||
        e.response?.data?.detail ||
        "Failed to create booking.";
      showNotification(errorMsg, "error");""",
    """      showNotification(extractErrorMessage(e, "Failed to create booking."), "error");""",
)

content = content.replace(
    """showNotification("Failed to save changes", "error");""",
    """showNotification(extractErrorMessage(e, "Failed to save changes"), "error");""",
)
content = content.replace(
    """showNotification("Failed to update status", "error");""",
    """showNotification(extractErrorMessage(e, "Failed to update status"), "error");""",
)
content = content.replace(
    """showNotification("Failed to delete booking", "error");""",
    """showNotification(extractErrorMessage(e, "Failed to delete booking"), "error");""",
)

with open("src/pages/Bookings.tsx", "w") as f:
    f.write(content)
