---
image:
layout: page
permalink: /categories
redirect_from:
    - /category/diverse
    - /category/tehnologie
title: Categories
---

{%- capture site_categories -%}{%- for category in site.categories -%}{{ category | first }}{%- unless forloop.last -%},{%- endunless -%}{%- endfor -%}{%- endcapture -%}
{%- assign tag_words = site_categories | split:',' | sort -%}
{%- assign categoriesCount = site.categories.size -%}

<section class="blog-tags">
    <ul class="tags clearfix">
        {%- for item in (0..categoriesCount) -%}
            {%- unless forloop.last -%}
                {%- capture this_word -%}{{ tag_words[item] | strip_newlines }}{%- endcapture -%}
                <li>
                    <a href="#{{ this_word | cgi_escape }}" class="tag">
                        {{ this_word }} <span>({{ site.categories[this_word].size }})</span>
                    </a>
                </li>
            {%- endunless -%}
        {%- endfor -%}
    </ul>
</section>

{%- for item in (0..categoriesCount) -%}
    {%- unless forloop.last -%}
        {%- capture this_word -%}{{ tag_words[item] | strip_newlines }}{%- endcapture -%}
        <section>
            <h3 id="{{ this_word | cgi_escape }}">{{ this_word }}</h3>
            <ul>
                {%- for post in site.categories[this_word] -%}
                    {%- if post.title != null -%}
                        <li class="tag-list">
                            <span><a href="{{ post.url }}">{{ post.title }}</a></span>
                            <small><span>{{ post.date | date_to_string }}</span></small>
                        </li>
                    {%- endif -%}
                {%- endfor -%}
            </ul>
        </section>
    {%- endunless -%}
{%- endfor -%}

