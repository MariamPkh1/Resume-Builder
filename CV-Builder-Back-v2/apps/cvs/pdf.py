from django.template.loader import render_to_string


def render_cv_pdf(*, cv, watermark=False, template="classic"):
    from weasyprint import HTML
    europass_templates = ["europass", "modern"]
    template_name = "cvs/pdf_europass.html" if template in europass_templates else "cvs/pdf.html"
    html_string = render_to_string(template_name, {"cv": cv, "watermark": watermark})
    return HTML(string=html_string).write_pdf()


def check_pdf_engine():
    try:
        from weasyprint import HTML

        HTML(string="<html><body><p>PDF engine check</p></body></html>").write_pdf()
        return True, ""
    except Exception as exc:
        return False, str(exc)
