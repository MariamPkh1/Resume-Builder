{# Standard section headings by export language (not user-edited section.title). #}
{% if section_type == "summary" %}
  {% if pdf_language == "ka" %}პროფესიული შეჯამება{% else %}Professional Summary{% endif %}
{% elif section_type == "experience" %}
  {% if pdf_language == "ka" %}სამუშაო გამოცდილება{% else %}Work Experience{% endif %}
{% elif section_type == "education" %}
  {% if pdf_language == "ka" %}განათლება{% else %}Education{% endif %}
{% elif section_type == "skills" %}
  {% if pdf_language == "ka" %}უნარები{% else %}Skills{% endif %}
{% elif section_type == "projects" %}
  {% if pdf_language == "ka" %}პროექტები{% else %}Projects{% endif %}
{% elif section_type == "languages" %}
  {% if pdf_language == "ka" %}ენები{% else %}Languages{% endif %}
{% elif section_type == "certificates" %}
  {% if pdf_language == "ka" %}სერტიფიკატები{% else %}Certificates{% endif %}
{% else %}
  {{ section_type }}
{% endif %}
