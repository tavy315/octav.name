---
author: octav
category: Tech
date: 2015-05-20 12:12:30 +0200
image: /wp-content/uploads/2015/05/drop.png
layout: post
title: "Bash script to block an IP address in linux"
---

<p>In order to block an IP or a class of IPs on your Linux server you need to use iptables tools (administration tool for
IPv4 packet filtering and NAT) and netfilter firewall. First you need to log into shell as root user.<br />
<img width="750" height="200" src="/wp-content/uploads/2015/05/drop.png" alt="" decoding="async"
srcset="/wp-content/uploads/2015/05/drop.png 750w" sizes="(max-width: 750px) 100vw, 750px" /></p>

To block an IP address you need to type the command as follows:
{% highlight bash %}
./drop IP
{% endhighlight %}

You can also unblock an IP by suppling -r parameter:
{% highlight bash %}
./drop -r IP
{% endhighlight %}

Here’s the code for the script:
{% gist 70c7ed6b1addb2b93ce6 %}

