// Deprecated: Global merchant layout removed to avoid protecting /merchant/auth/*
// The protected merchant area is now under `app/merchant/(protected)/layout.tsx`.
export default function PassthroughLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
