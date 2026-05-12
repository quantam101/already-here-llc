import Image from 'next/image';
import manifest from '@/data/gallery-manifest.json';
import { representativeWork } from '@/lib/site';

type GalleryImage = {
  id: string;
  src: string;
  title: string;
  category: string;
  description: string;
  redaction?: string;
  updatedAt?: string;
};

const galleryImages = (manifest.images || []) as GalleryImage[];

export function ProjectGalleryGrid() {
  if (galleryImages.length > 0) {
    return (
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {galleryImages.map((item) => (
          <article key={item.id} className="card overflow-hidden">
            <div className="relative aspect-[4/3] border-b border-borderBrand bg-soft">
              <Image src={item.src} alt={item.title} fill sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw" className="object-cover" />
            </div>
            <div className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-action">{item.category}</p>
              <h2 className="mt-3 text-xl font-semibold text-navy">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-700">{item.description}</p>
              {item.redaction ? <p className="mt-4 text-xs leading-6 text-slate-500">{item.redaction}</p> : null}
            </div>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {representativeWork.map((item) => (
        <article key={`${item.client}-${item.tag}`} className="card overflow-hidden">
          <div className="border-b border-borderBrand bg-navy p-6 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">{item.tag}</p>
            <h2 className="mt-3 text-xl font-semibold">{item.client}</h2>
          </div>
          <div className="p-6">
            <div className="mb-5 grid aspect-[4/3] place-items-center rounded-3xl border border-dashed border-borderBrand bg-soft p-6 text-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-action">Redacted visual slot</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">Before/after photos, rack images, labels, serials, and site-sensitive details are withheld publicly.</p>
              </div>
            </div>
            <p className="text-sm leading-7 text-slate-700">{item.scope}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
