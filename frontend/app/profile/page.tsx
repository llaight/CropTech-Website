export default function ProfilePage() {
  // Simple profile page that reads user from localStorage in the browser if present
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="mt-2 text-sm text-slate-600">This is the Profile page (placeholder).</p>
        <div id="profile-root" className="mt-4"></div>
      </div>
    </div>
  );
}
