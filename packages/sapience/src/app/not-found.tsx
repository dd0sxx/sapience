export const generateMetadata = () => {
  return {
    title: '404 | Sapience',
    description: 'Page not found',
  };
};

export default function NotFound() {
  return (
    <div className="flex min-h-[70dvh] w-full flex-col justify-center">
      <div className="mx-auto w-full">
        <h1 className="mb-3 text-center text-2xl font-bold">404</h1>
        <h2 className="text-center text-xl font-bold">🖕</h2>
      </div>
    </div>
  );
}
