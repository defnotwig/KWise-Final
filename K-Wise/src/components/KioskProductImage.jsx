import React from "react";
import PropTypes from "prop-types";
import { normalizeImageVariants, resolveProductImage } from "../utils/kioskContracts";

const KioskProductImage = React.memo(function KioskProductImage({
  product,
  alt,
  className,
  fallbackSrc,
  variant = "card",
  sizes = "(max-width: 768px) 45vw, 220px",
  width = 220,
  height = 220,
  loading = "lazy",
  decoding = "async",
  ...props
}) {
  const variants = normalizeImageVariants(product || {});
  const src = variants[variant]
    || variants.card
    || variants.detail
    || variants.original
    || resolveProductImage(product || {}, fallbackSrc)
    || fallbackSrc;
  const srcSet = [
    variants.thumb ? `${variants.thumb} 96w` : null,
    variants.card ? `${variants.card} 320w` : null,
    variants.detail ? `${variants.detail} 900w` : null
  ].filter(Boolean).join(", ");

  return (
    <img
      src={src}
      srcSet={srcSet || undefined}
      sizes={srcSet ? sizes : undefined}
      alt={alt || product?.name || "Product image"}
      className={className}
      width={width}
      height={height}
      loading={loading}
      decoding={decoding}
      onError={(event) => {
        if (!fallbackSrc || event.currentTarget.dataset.fallbackApplied === "true") return;
        event.currentTarget.dataset.fallbackApplied = "true";
        event.currentTarget.removeAttribute("srcset");
        event.currentTarget.src = fallbackSrc;
      }}
      {...props}
    />
  );
});

KioskProductImage.propTypes = {
  product: PropTypes.object,
  alt: PropTypes.string,
  className: PropTypes.string,
  fallbackSrc: PropTypes.string,
  variant: PropTypes.oneOf(["thumb", "card", "detail", "original"]),
  sizes: PropTypes.string,
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  loading: PropTypes.oneOf(["lazy", "eager"]),
  decoding: PropTypes.oneOf(["async", "sync", "auto"])
};

export default KioskProductImage;
