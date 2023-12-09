---
author: octav
category: Tech
date: 2017-01-23 11:10:00 +0200
image:
layout: post
title: "Create a SOCKS proxy on Linux with SSH to bypass content filters"
---

<p>Are you on a network with limited access? Is someone filtering your internet traffic, limiting your abilities? Well, if you have SSH access to <em>any</em>server, you can probably set up your own SOCKS5 proxy and tunnel all your traffic over SSH.</p>
<p>From that point on, what you do on your laptop/computer is sent encrypted to the SOCKS5 proxy (your SSH server) and <em>that</em> server sends the traffic to the outside. It's an SSH tunnel on steroids through which you can easily pass HTTP and HTTPs traffic. And it isn't even that hard. This guide is for Linux/Mac OSX users that have direct access to a terminal, but the same logic applies to <em>PuTTy</em> on Windows too.</p>
<a href="https://ma.ttias.be/socks-proxy-linux-ssh-bypass-content-filters/">See full article</a>
