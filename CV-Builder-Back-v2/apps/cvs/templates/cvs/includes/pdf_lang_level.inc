{% if level == "Native" %}
  {% if pdf_language == "ka" %}მშობლიური{% else %}Native{% endif %}
{% elif level == "Fluent" %}
  {% if pdf_language == "ka" %}გამართულად{% else %}Fluent{% endif %}
{% elif level == "Professional" %}
  {% if pdf_language == "ka" %}პროფესიულ დონეზე{% else %}Professional{% endif %}
{% elif level == "Intermediate" %}
  {% if pdf_language == "ka" %}საშუალო დონეზე{% else %}Intermediate{% endif %}
{% elif level == "Basic" %}
  {% if pdf_language == "ka" %}საწყისი დონე{% else %}Basic{% endif %}
{% elif level == "B2" or level == "b2" or level == "B1" or level == "b1" %}
  {% if pdf_language == "ka" %}საშუალო დონეზე{% else %}Intermediate{% endif %}
{% elif level == "C1" or level == "c1" %}
  {% if pdf_language == "ka" %}პროფესიულ დონეზე{% else %}Professional{% endif %}
{% elif level == "C2" or level == "c2" %}
  {% if pdf_language == "ka" %}გამართულად{% else %}Fluent{% endif %}
{% elif level == "A1" or level == "a1" or level == "A2" or level == "a2" %}
  {% if pdf_language == "ka" %}საწყისი დონე{% else %}Basic{% endif %}
{% elif level == "მშობლიური" or level == "გამართულად" or level == "პროფესიულ დონეზე" or level == "საშუალო დონეზე" or level == "საწყისი დონე" %}
  {{ level }}
{% endif %}
