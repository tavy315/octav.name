---
author: octav
category: Tech
date: 2013-06-17 15:30:11 +0200
image:
layout: post
title: "Delete error_log files from /home"
---

If you ever want to delete the `error_log` files from all the websites hosted on your server, and you have access to the server via SSH, the following command will quietly remove these files:

{% highlight bash %}
find /home/ -type f -name error_log -delete
{% endhighlight %}
