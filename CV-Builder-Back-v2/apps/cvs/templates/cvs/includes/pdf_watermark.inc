{# Small Nebula logo — top-right on free-tier PDFs. Requires watermark_logo_url in context. #}
{% if watermark and watermark_logo_url %}
<style>
  .pdf-watermark-logo {
    position: fixed;
    top: 10px;
    right: 10px;
    width: 34px;
    height: 34px;
    object-fit: contain;
    opacity: 0.68;
    z-index: 10;
    pointer-events: none;
  }
</style>
<img src="{{ watermark_logo_url }}" alt="" class="pdf-watermark-logo" />
{% endif %}
