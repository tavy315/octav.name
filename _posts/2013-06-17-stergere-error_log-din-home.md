---
author: octav
category: Tech
date: 2013-06-17 15:30:11 +0200
image:
layout: post
title: "Ștergere error_log din /home"
---

Dacă dorești vreodată să ștergi fișierele error_log de la toate site-urile găzduite pe server, și ai acces la server
prin intermediul SSH, următoarea comandă va elimina în liniște aceste fișiere:

{% highlight bash %}
find /home/ -type f -name error_log -delete
{% endhighlight %}
