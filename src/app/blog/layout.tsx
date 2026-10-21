// every blog page gets the glow from the top-right corner
export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div
        aria-hidden="true"
        className="corner-glow absolute top-0 left-[6vw] -z-10 h-[64vh] w-screen opacity-90"
      />
      {children}
    </>
  );
}
