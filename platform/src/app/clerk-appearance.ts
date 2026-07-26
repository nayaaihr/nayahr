// Brand theme for Clerk widgets (sign-in, sign-up, user button).
// Navy is the primary brand colour; coral is the accent.
// Kept to string-valued CSS props + variables so it stays plain/serializable.

export const clerkAppearance = {
  variables: {
    colorPrimary: "#241a40",        // navy — buttons, focus rings, links
    colorText: "#1d1d1f",
    colorTextSecondary: "#6b6b70",
    colorBackground: "#ffffff",
    colorInputBackground: "#ffffff",
    colorInputText: "#1d1d1f",
    borderRadius: "10px",
  },
  elements: {
    card: {
      boxShadow: "0 1px 2px rgba(0,0,0,.05), 0 14px 40px rgba(0,0,0,.08)",
      border: "1px solid #e6e6ea",
    },
    headerTitle: { color: "#241a40" },
    footerActionLink: { color: "#ec6a49" },   // coral accent for links
  },
};
