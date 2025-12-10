export const QualityCard = ({
  title,
  description,
  svg,
}: {
  title: string
  description: string
  svg?: string
}) => {
  return (
    <div
      className="w-full h-full card bg-base-100 shadow-sm transition-colors"
      style={svg
        ? {
            maskImage: `linear-gradient(#000, #000), url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
            maskPosition: '0 0, right 16px bottom 16px',
            maskSize: '100% 100%, 32px 32px',
            maskComposite: 'subtract',
            maskRepeat: 'no-repeat',
          }
        : {}}
    >
      <figure>
        {/* {image && <img src={image} alt={title} />} */}
      </figure>
      <div className="card-body p-8 min-h-44">
        <h1 className="card-title text-lg lg:text-xl mb-2">{title}</h1>
        <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm lg:text-md">{description}</p>
        {/* <div className="card-actions justify-end">
          <button className="btn btn-primary">Buy Now</button>
        </div> */}
      </div>
    </div>
  )
}
