import { Skeleton } from "@/components/ui/Skeleton";

export default function ProductLoading() {
  return (
    <>
      <section className="pt-9 px-12 pb-0">
        <Skeleton className="h-[13px] w-28 rounded-full" />
      </section>

      <section className="pt-8 px-12 pb-20 grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-14 max-w-[1100px] mx-auto items-center">
        <Skeleton className="aspect-square w-full rounded-[28px]" />

        <div>
          <Skeleton className="h-[13px] w-24 mb-3.5 rounded-full" />
          <Skeleton className="h-10 w-3/4 mb-3.5" />
          <Skeleton className="h-6 w-28 mb-2 rounded-full" />
          <Skeleton className="h-4 w-44 mb-[22px] rounded-full" />

          <div className="flex flex-col gap-2 max-w-[440px] mb-8">
            <Skeleton className="h-4 w-full rounded-full" />
            <Skeleton className="h-4 w-full rounded-full" />
            <Skeleton className="h-4 w-2/3 rounded-full" />
          </div>

          <div className="flex flex-col gap-[18px]">
            <div className="flex items-center gap-3.5 flex-wrap">
              <Skeleton className="h-11 w-[130px] rounded-[30px]" />
              <Skeleton className="h-12 w-[148px]" />
            </div>
            <div className="flex gap-3.5 flex-wrap items-center">
              <Skeleton className="h-11 w-[230px]" />
              <Skeleton className="h-4 w-[150px] rounded-full" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
