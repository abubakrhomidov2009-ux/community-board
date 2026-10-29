import { notFound } from 'next/navigation';

// Any address that matches no page: show the translated 404 page inside the normal layout.
export default function CatchAll() {
  notFound();
}
