"""Draws the pictures for the intro deck (flame tests, nucleus, electron cloud,
energy curves, sun, pH bar). Everything is generated from math, so there are no
photo licences to worry about. Run:  python3 build_images.py
Writes PNGs and img/meta.json (coordinates the deck builder needs).
"""
import json
import math
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "img")
os.makedirs(OUT, exist_ok=True)
META = {}


def hex2rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def over(base, top):
    return Image.alpha_composite(base, top)


def glow(layer, radius, gain=1.6):
    """Put a blurred, brightened copy of an RGBA layer underneath it."""
    blurred = layer.filter(ImageFilter.GaussianBlur(radius))
    a = np.asarray(blurred).astype(float)
    a[..., 3] = np.clip(a[..., 3] * gain, 0, 255)
    return over(Image.fromarray(a.astype("uint8"), "RGBA"), layer)


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------- flames
def flame(color_hex, seed=0.0, W=600, H=1000, hs=1.0):
    ys, xs = np.mgrid[0:H, 0:W].astype(float)
    base = 0.84 * H
    tip = base - (base - 0.04 * H) * hs
    v = (base - ys) / (base - tip)                    # 0 at burner, 1 at tip
    xn = (xs - W / 2) / W
    sway = 0.035 * np.sin(5.5 * v + seed) * np.clip(v, 0, None) ** 1.2 + 0.02 * np.sin(11 * v + 2 * seed) * v
    dx = xn - sway
    vv = np.clip(v, 1e-4, 1 - 1e-4)
    f = (vv ** 0.35) * ((1 - vv) ** 1.2) / 0.438
    w = 0.21 * f + 1e-6
    inside = np.clip(1 - np.abs(dx) / w, 0, 1)
    inside[(v <= 0) | (v >= 1)] = 0
    alpha = np.clip(inside * 2.6, 0, 1) ** 1.3
    elem = np.array(hex2rgb(color_hex), float) / 255
    core = np.clip(inside, 0, 1) ** 1.6 * (1 - 0.55 * v)
    col = elem[None, None, :] * (1 - 0.72 * core[..., None]) + 0.72 * core[..., None]
    blue = np.clip(1 - v / 0.22, 0, 1) * inside ** 1.5 * 0.55
    col = col * (1 - blue[..., None]) + np.array([0.35, 0.55, 1.0]) * blue[..., None]
    img = np.zeros((H, W, 4))
    img[..., :3] = np.clip(col, 0, 1) * 255
    img[..., 3] = alpha * 235
    fl = Image.fromarray(img.astype("uint8"), "RGBA")
    # outer glow tinted with the element colour
    halo = np.zeros((H, W, 4))
    halo[..., :3] = elem * 255
    halo[..., 3] = alpha * 255
    halo_img = Image.fromarray(halo.astype("uint8"), "RGBA").filter(ImageFilter.GaussianBlur(38))
    ha = np.asarray(halo_img).astype(float)
    ha[..., 3] *= 0.55
    halo_img = Image.fromarray(ha.astype("uint8"), "RGBA")
    out = over(halo_img, fl)
    # burner tube
    d = ImageDraw.Draw(out)
    bx0, bx1, by0 = int(W * 0.40), int(W * 0.60), int(base) - 4
    for x in range(bx0, bx1):
        t = (x - bx0) / (bx1 - bx0)
        shade = int(95 + 110 * math.sin(math.pi * t) ** 1.5)
        d.line([(x, by0), (x, H - 1)], fill=(shade, shade + 6, shade + 22, 255))
    d.rectangle([bx0 - 6, by0, bx1 + 6, by0 + 12], fill=(60, 66, 90, 255))
    d.rectangle([int(W * 0.30), H - 40, int(W * 0.70), H - 1], fill=(70, 76, 104, 255))
    return out


FLAMES = {"li": ("FF3355", 0.3), "na": ("FFC81E", 1.4), "k": ("B58CFF", 2.2),
          "ca": ("FF7A2E", 3.1), "cu": ("2EE08A", 4.0), "demo": ("FF8A2E", 5.0)}
for key, (c, s) in FLAMES.items():
    flame(c, s).save(os.path.join(OUT, f"flame_{key}.png"))


# ---------------------------------------------------------------- nucleus
def nucleus(S=1000):
    phi = (1 + 5 ** 0.5) / 2
    verts = []
    for a in (-1, 1):
        for b in (-phi, phi):
            verts += [(0, a, b), (a, b, 0), (b, 0, a)]
    verts = np.array(verts, float)
    verts /= np.linalg.norm(verts[0])
    ax, ay = 0.5, 0.7
    rx = np.array([[1, 0, 0], [0, math.cos(ax), -math.sin(ax)], [0, math.sin(ax), math.cos(ax)]])
    ry = np.array([[math.cos(ay), 0, math.sin(ay)], [0, 1, 0], [-math.sin(ay), 0, math.cos(ay)]])
    verts = verts @ rx.T @ ry.T
    order = np.argsort(verts[:, 2])
    scale = S * 0.30
    r_px = int(0.5257 * scale)
    kinds = [0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0]       # 6 protons, 6 neutrons
    canvas = np.zeros((S, S, 4), float)
    yy, xx = np.mgrid[-r_px:r_px + 1, -r_px:r_px + 1].astype(float)
    rr = np.sqrt(xx ** 2 + yy ** 2) / r_px
    mask = rr <= 1
    nz = np.sqrt(np.clip(1 - rr ** 2, 0, 1))
    nx, ny = xx / r_px, yy / r_px
    L = np.array([-0.4, -0.5, 0.77]); L /= np.linalg.norm(L)
    diff = np.clip(nx * L[0] + ny * L[1] + nz * L[2], 0, 1)
    spec = np.clip(2 * (nx * L[0] + ny * L[1] + nz * L[2]) * nz - L[2], 0, 1) ** 24
    for i in order:
        x, y, z = verts[i]
        cx, cy = int(S / 2 + x * scale), int(S / 2 + y * scale)
        base = np.array([255, 70, 96], float) if kinds[i] == 0 else np.array([150, 162, 190], float)
        shade = 0.28 + 0.78 * diff
        col = base[None, None, :] * shade[..., None] + 255 * 0.55 * spec[..., None]
        col = np.clip(col, 0, 255)
        y0, y1, x0, x1 = cy - r_px, cy + r_px + 1, cx - r_px, cx + r_px + 1
        reg = canvas[y0:y1, x0:x1]
        m = mask[..., None]
        reg[..., :3] = np.where(m, col, reg[..., :3])
        reg[..., 3] = np.where(mask, 255, reg[..., 3])
    img = Image.fromarray(canvas.astype("uint8"), "RGBA")
    # draw "+" on protons so they can be told apart in black and white
    img.save(os.path.join(OUT, "nucleus.png"))


nucleus()


# ---------------------------------------------------------------- electron cloud
def cloud(S=1400, seed=7):
    rng = np.random.default_rng(seed)
    n = 70000
    pts = []
    k1, k2, k3 = int(n * 0.30), int(n * 0.50), int(n * 0.20)
    r1 = np.abs(rng.normal(0, 0.075, k1))
    r2 = rng.normal(0.27, 0.06, k2)
    r3 = rng.normal(0.43, 0.045, k3)
    for r in (r1, r2, r3):
        th = rng.uniform(0, 2 * np.pi, len(r))
        pts.append(np.stack([np.cos(th) * np.abs(r), np.sin(th) * np.abs(r)], 1))
    pts = np.concatenate(pts)
    H, _, _ = np.histogram2d(pts[:, 1] * S + S / 2, pts[:, 0] * S + S / 2, bins=S, range=[[0, S], [0, S]])
    img = Image.fromarray(np.clip(H * 110, 0, 255).astype("uint8"), "L").filter(ImageFilter.GaussianBlur(5))
    a = np.asarray(img).astype(float) / 255
    a = 1 - np.exp(-a * 9.0)
    rgba = np.zeros((S, S, 4))
    cyan = np.array([34, 211, 238], float)
    rgba[..., :3] = cyan * (1 - 0.5 * a[..., None]) + 255 * 0.5 * a[..., None]
    rgba[..., 3] = np.clip(a * 255 * 0.95, 0, 255)
    out = Image.fromarray(rgba.astype("uint8"), "RGBA")
    out = glow(out, 22, 1.1)
    d = ImageDraw.Draw(out)
    c = S // 2
    for r, al in ((26, 90), (16, 255)):
        d.ellipse([c - r, c - r, c + r, c + r], fill=(255, 90, 110, al))
    out.save(os.path.join(OUT, "cloud.png"))


cloud()


# ---------------------------------------------------------------- orbits (title)
def orbits(S=1600):
    sc = 2
    big = S * sc
    layer = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    c = big / 2
    a_, b_ = big * 0.46, big * 0.17
    cols = [(34, 211, 238), (255, 122, 26), (182, 109, 255)]
    dots = []
    for i, ang in enumerate((0, 60, 120)):
        pts = []
        for k in range(361):
            t = math.radians(k)
            x, y = a_ * math.cos(t), b_ * math.sin(t)
            r = math.radians(ang)
            pts.append((c + x * math.cos(r) - y * math.sin(r), c + x * math.sin(r) + y * math.cos(r)))
        d.line(pts, fill=cols[i] + (255,), width=7)
        t = math.radians(40 + 100 * i)
        x, y = a_ * math.cos(t), b_ * math.sin(t)
        r = math.radians(ang)
        dots.append((c + x * math.cos(r) - y * math.sin(r), c + x * math.sin(r) + y * math.cos(r), cols[i]))
    layer = layer.resize((S, S), Image.LANCZOS)
    layer = glow(layer, 14, 1.3)
    top = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d2 = ImageDraw.Draw(top)
    for x, y, col in dots:
        x, y = x / sc, y / sc
        d2.ellipse([x - 24, y - 24, x + 24, y + 24], fill=col + (255,))
    top = glow(top, 16, 1.5)
    out = over(layer, top)
    nuc = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d3 = ImageDraw.Draw(nuc)
    cc = S / 2
    for r, col in ((46, (255, 122, 26, 255)), (28, (255, 214, 120, 255)), (14, (255, 255, 255, 255))):
        d3.ellipse([cc - r, cc - r, cc + r, cc + r], fill=col)
    nuc = glow(nuc, 26, 1.8)
    over(out, nuc).save(os.path.join(OUT, "orbits.png"))


orbits()


# ---------------------------------------------------------------- bond-energy curve
def morse_image(W=1500, H=900):
    sc = 2
    big = Image.new("RGBA", (W * sc, H * sc), (0, 0, 0, 0))
    d = ImageDraw.Draw(big)
    L, R, T, B = 130, W - 40, 50, H - 90         # plot box (pixels at 1x)
    r_min, r_max, v_min, v_max = 0.55, 3.7, -1.2, 1.0

    def px(r, v):
        return (L + (r - r_min) / (r_max - r_min) * (R - L), T + (v_max - v) / (v_max - v_min) * (B - T))

    def V(r):
        return (1 - math.exp(-1.7 * (r - 1.0))) ** 2 - 1

    axis = (200, 210, 240, 255)
    d.line([(L * sc, T * sc), (L * sc, B * sc), (R * sc, B * sc)], fill=axis, width=6 * sc // 2)
    # zero-energy dashed line (free atoms)
    y0 = px(1, 0)[1]
    x = L
    while x < R:
        d.line([(x * sc, y0 * sc), (min(x + 16, R) * sc, y0 * sc)], fill=(150, 160, 200, 255), width=3 * sc // 2)
        x += 30
    pts = []
    r = 0.62
    while r <= r_max:
        x_, y_ = px(r, V(r))
        pts.append((x_ * sc, y_ * sc))
        r += 0.01
    d.line(pts, fill=(34, 211, 238, 255), width=11 * sc, joint="curve")
    img = big.resize((W, H), Image.LANCZOS)
    img = glow(img, 8, 1.2)
    img.save(os.path.join(OUT, "bondwell.png"))
    path = []
    r = 3.3
    while r > 1.0:
        x_, y_ = px(r, V(r))
        path.append([x_ / W, y_ / H])
        r -= 0.05 if r > 1.6 else 0.03
    x_, y_ = px(1.0, V(1.0))
    path.append([x_ / W, y_ / H])
    META["bondwell"] = {"w": W, "h": H, "path": path,
                        "zero_y": y0 / H, "well_x": px(1, 0)[0] / W, "well_y": px(1, -1)[1] / H}


morse_image()


# ---------------------------------------------------------------- reaction profiles
def profile(name, start, end, peak, W=1200, H=800):
    sc = 2
    big = Image.new("RGBA", (W * sc, H * sc), (0, 0, 0, 0))
    d = ImageDraw.Draw(big)
    L, R, T, B = 90, W - 40, 50, H - 70

    def Y(level):
        return T + (1 - level) * (B - T)

    axis = (200, 210, 240, 255)
    d.line([(L * sc, T * sc), (L * sc, B * sc), (R * sc, B * sc)], fill=axis, width=6)
    xs = np.linspace(0.0, 1.0, 600)
    s = smoothstep(0.42, 0.66, xs)
    bump = np.exp(-((xs - 0.5) / 0.115) ** 2)
    base_lev = start + (end - start) * s
    lo, hi = 0.0, 3.0
    for _ in range(40):
        mid = (lo + hi) / 2
        if (base_lev + mid * bump).max() < peak:
            lo = mid
        else:
            hi = mid
    lev = base_lev + lo * bump
    pts = [((L + (0.04 + 0.92 * x) * (R - L)) * sc, Y(l) * sc) for x, l in zip(xs, lev)]
    for lvl, x0f, x1f in ((start, 0.04, 0.30), (end, 0.72, 0.96)):
        yy = Y(lvl) * sc
        xa = (L + x0f * (R - L)) * sc
        xb = (L + x1f * (R - L)) * sc
        d.line([(xa, yy), (xb, yy)], fill=(34, 211, 238, 255), width=22)
    d.line(pts, fill=(34, 211, 238, 255), width=11 * sc, joint="curve")
    img = big.resize((W, H), Image.LANCZOS)
    img = glow(img, 8, 1.2)
    img.save(os.path.join(OUT, f"{name}.png"))
    META[name] = {"w": W, "h": H, "y_start": Y(start) / H, "y_end": Y(end) / H, "y_peak": Y(peak) / H,
                  "x_left": L / W, "x_peak": (L + (0.04 + 0.92 * 0.5) * (R - L)) / W,
                  "x_right": (L + 0.84 * (R - L)) / W, "x_react": (L + 0.17 * (R - L)) / W}


profile("profile_exo", 0.62, 0.22, 0.92)
profile("profile_endo", 0.22, 0.62, 0.92)


# ---------------------------------------------------------------- sun
def sun(S=1200, seed=3):
    rng = np.random.default_rng(seed)
    ys, xs = np.mgrid[0:S, 0:S].astype(float)
    r = np.hypot(xs - S / 2, ys - S / 2) / (S / 2)
    disc = 1 - smoothstep(0.52, 0.56, r)
    ang = np.arctan2(ys - S / 2, xs - S / 2)
    spikes = np.zeros_like(r)
    for _ in range(46):
        a0 = rng.uniform(-math.pi, math.pi)
        wid = rng.uniform(0.02, 0.06)
        ln = rng.uniform(0.62, 0.98)
        da = np.abs(((ang - a0 + math.pi) % (2 * math.pi)) - math.pi)
        spikes = np.maximum(spikes, np.exp(-(da / wid) ** 2) * np.clip((ln - r) / (ln - 0.5), 0, 1) * (r > 0.5))
    corona = np.exp(-((r - 0.52) / 0.16) ** 2) * (r > 0.5) * 0.65
    rim = np.clip(r / 0.56, 0, 1)
    c_in, c_mid, c_out = np.array([255, 244, 180.]), np.array([255, 178, 44.]), np.array([255, 96, 30.])
    t = rim[..., None]
    disc_col = np.where(t < 0.55, c_in * (1 - t / 0.55) + c_mid * (t / 0.55),
                        c_mid * (1 - (t - 0.55) / 0.45) + c_out * ((t - 0.55) / 0.45))
    a = np.clip(disc + spikes * 0.7 + corona, 0, 1)
    img = np.zeros((S, S, 4))
    img[..., :3] = np.where(disc[..., None] > 0.5, disc_col, c_mid * 0.9 + 25)
    img[..., 3] = a * 255
    Image.fromarray(img.astype("uint8"), "RGBA").filter(ImageFilter.GaussianBlur(1.5)).save(os.path.join(OUT, "sun.png"))


sun()


# ---------------------------------------------------------------- pH bar
def phbar(W=2400, H=170):
    stops = [(0, "FF1F3D"), (2, "FF5A1F"), (4, "FFC21F"), (6, "C8E61F"), (7, "3DDC6E"),
             (8, "22C7B8"), (10, "2D8CFF"), (12, "5B4BFF"), (14, "9B3DFF")]
    cols = [(p, np.array(hex2rgb(h), float)) for p, h in stops]
    arr = np.zeros((H, W, 4))
    for x in range(W):
        p = x / (W - 1) * 14
        for (p0, c0), (p1, c1) in zip(cols, cols[1:]):
            if p0 <= p <= p1:
                t = (p - p0) / (p1 - p0)
                arr[:, x, :3] = c0 * (1 - t) + c1 * t
                break
    arr[..., 3] = 255
    mask = Image.new("L", (W * 2, H * 2), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, W * 2 - 1, H * 2 - 1], radius=H, fill=255)
    mask = mask.resize((W, H), Image.LANCZOS)
    img = Image.fromarray(arr.astype("uint8"), "RGBA")
    img.putalpha(mask)
    img.save(os.path.join(OUT, "phbar.png"))


phbar()


# ---------------------------------------------------------------- backgrounds (soft floating "atoms")
def background(name, base_hex, seed, tints):
    W, H = 1920, 1080
    rng = np.random.default_rng(seed)
    img = Image.new("RGBA", (W, H), hex2rgb(base_hex) + (255,))
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i in range(34):
        r = rng.uniform(5, 26)
        x, y = rng.uniform(0, W), rng.uniform(0, H)
        col = hex2rgb(tints[i % len(tints)])
        d.ellipse([x - r, y - r, x + r, y + r], fill=col + (int(rng.uniform(28, 60)),))
    layer = layer.filter(ImageFilter.GaussianBlur(2.5))
    # a couple of large soft glows for depth
    glow_l = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dg = ImageDraw.Draw(glow_l)
    for cx, cy, r, col in ((W * 0.08, H * 0.95, 420, tints[0]), (W * 0.95, H * 0.05, 380, tints[1])):
        dg.ellipse([cx - r, cy - r, cx + r, cy + r], fill=hex2rgb(col) + (34,))
    glow_l = glow_l.filter(ImageFilter.GaussianBlur(140))
    out = over(over(img, glow_l), layer).convert("RGB")
    out.save(os.path.join(OUT, name))


background("bg_navy.png", "0B1030", 5, ["22D3EE", "B66DFF", "FF7A1A", "5BE584"])
background("bg_demo.png", "2B0A18", 9, ["FF7A1A", "FF4D6D", "FFD23F", "B66DFF"])


# ================================================================ MASCOTS (cartoon atoms with faces)
def heart(d, x, y, s, fill):
    d.ellipse([x - 0.5 * s, y - 0.4 * s, x + 0.0 * s, y + 0.1 * s], fill=fill)
    d.ellipse([x + 0.0 * s, y - 0.4 * s, x + 0.5 * s, y + 0.1 * s], fill=fill)
    d.polygon([(x - 0.49 * s, y - 0.12 * s), (x + 0.49 * s, y - 0.12 * s), (x, y + 0.55 * s)], fill=fill)


def mascot(name, body_hex, mood, S=600):
    k = 2
    B = S * k
    cx = cy = B / 2
    R = B * 0.34
    ys, xs = np.mgrid[0:B, 0:B].astype(float)
    r = np.hypot(xs - cx, ys - cy) / R
    base = np.array(hex2rgb(body_hex), float)
    hl = np.clip(0.7 - np.hypot(xs - (cx - 0.35 * R), ys - (cy - 0.4 * R)) / R, 0, 1)
    col = base[None, None, :] * (0.72 + 0.34 * (1 - np.clip(r, 0, 1)))[..., None] + 70 * hl[..., None]
    alpha = 1 - smoothstep(0.985, 1.0, r)
    arr = np.zeros((B, B, 4))
    arr[..., :3] = np.clip(col, 0, 255)
    arr[..., 3] = alpha * 255
    body = Image.fromarray(arr.astype("uint8"), "RGBA")
    halo = np.zeros((B, B, 4)); halo[..., :3] = base; halo[..., 3] = alpha * 255
    halo_i = Image.fromarray(halo.astype("uint8"), "RGBA").filter(ImageFilter.GaussianBlur(B * 0.035))
    ha = np.asarray(halo_i).astype(float); ha[..., 3] *= 0.5
    img = over(Image.fromarray(ha.astype("uint8"), "RGBA"), body)
    d = ImageDraw.Draw(img)
    ink = (20, 22, 44, 255)
    lw = int(0.055 * R)
    ex, ey = 0.34 * R, -0.10 * R

    def eye(sign, er, pr, look=(0, 0)):
        x, y = cx + sign * ex, cy + ey
        d.ellipse([x - er, y - er, x + er, y + er], fill=(255, 255, 255, 255), outline=ink, width=int(lw * 0.5))
        px, py = x + look[0] * er * 0.5, y + look[1] * er * 0.5
        d.ellipse([px - pr, py - pr, px + pr, py + pr], fill=ink)
        d.ellipse([px - pr * 0.35 + pr * 0.3, py - pr * 0.6, px + pr * 0.35 + pr * 0.3, py - pr * 0.1], fill=(255, 255, 255, 255))

    def smile(w=0.30, top=0.02, bot=0.5, a0=20, a1=160):
        d.arc([cx - w * R, cy + top * R, cx + w * R, cy + bot * R], a0, a1, fill=ink, width=lw)

    def sweat():
        x, y = cx + 0.78 * R, cy - 0.42 * R
        d.polygon([(x, y - 0.32 * R), (x - 0.14 * R, y), (x + 0.14 * R, y)], fill=(120, 200, 255, 255))
        d.ellipse([x - 0.14 * R, y - 0.12 * R, x + 0.14 * R, y + 0.16 * R], fill=(120, 200, 255, 255))

    if mood == "happy":
        eye(-1, 0.2 * R, 0.09 * R); eye(1, 0.2 * R, 0.09 * R); smile()
    elif mood == "smug":
        for sgn in (-1, 1):
            x, y = cx + sgn * ex, cy + ey
            d.rounded_rectangle([x - 0.26 * R, y - 0.16 * R, x + 0.26 * R, y + 0.2 * R], radius=int(0.08 * R), fill=(10, 10, 20, 255))
            d.line([x - 0.16 * R, y - 0.08 * R, x - 0.04 * R, y - 0.08 * R], fill=(255, 255, 255, 200), width=int(0.035 * R))
        d.line([cx - 0.12 * R, cy + ey - 0.05 * R, cx + 0.12 * R, cy + ey - 0.05 * R], fill=(10, 10, 20, 255), width=lw)
        d.arc([cx - 0.12 * R, cy + 0.1 * R, cx + 0.38 * R, cy + 0.42 * R], 10, 120, fill=ink, width=lw)
    elif mood == "shocked":
        eye(-1, 0.26 * R, 0.06 * R, (0.4, 0.3)); eye(1, 0.26 * R, 0.06 * R, (-0.4, 0.3))
        d.ellipse([cx - 0.12 * R, cy + 0.28 * R, cx + 0.12 * R, cy + 0.58 * R], fill=ink)
        sweat()
    elif mood == "love":
        for sgn in (-1, 1):
            heart(d, cx + sgn * ex, cy + ey, 0.5 * R, (255, 70, 110, 255))
        d.arc([cx - 0.34 * R, cy + 0.0 * R, cx + 0.34 * R, cy + 0.55 * R], 15, 165, fill=ink, width=lw)
    elif mood == "grumpy":
        eye(-1, 0.19 * R, 0.09 * R, (0, 0.7)); eye(1, 0.19 * R, 0.09 * R, (0, 0.7))
        d.line([cx - 0.58 * R, cy - 0.40 * R, cx - 0.14 * R, cy - 0.26 * R], fill=ink, width=lw)
        d.line([cx + 0.58 * R, cy - 0.40 * R, cx + 0.14 * R, cy - 0.26 * R], fill=ink, width=lw)
        d.arc([cx - 0.28 * R, cy + 0.32 * R, cx + 0.28 * R, cy + 0.72 * R], 200, 340, fill=ink, width=lw)
    elif mood == "fine":
        eye(-1, 0.24 * R, 0.035 * R); eye(1, 0.24 * R, 0.035 * R)
        d.rounded_rectangle([cx - 0.30 * R, cy + 0.22 * R, cx + 0.30 * R, cy + 0.46 * R], radius=int(0.08 * R), fill=(255, 255, 255, 255), outline=ink, width=int(lw * 0.6))
        for i in range(1, 5):
            xx = cx - 0.30 * R + i * 0.12 * R
            d.line([xx, cy + 0.22 * R, xx, cy + 0.46 * R], fill=ink, width=int(lw * 0.3))
        sweat()
    img = img.resize((S, S), Image.LANCZOS)
    img.save(os.path.join(OUT, f"mascot_{name}.png"))


mascot("alkali", "FF4D6D", "love")
mascot("halogen", "5BE584", "shocked")
mascot("noble", "7DD3FC", "smug")
mascot("sodium", "C084FC", "smug")
mascot("h", "7DD3FC", "happy")
mascot("grumpy", "9AA7E0", "grumpy")
mascot("cool", "22D3EE", "smug")
mascot("fine", "FFD23F", "fine")

# ================================================================ ANIMATED GIFs
NAVY = (11, 16, 48)


def to_gif(frames, name, ms, colors=200):
    """Animated GIF with real transparency (pixels that are nearly see-through become transparent),
    so the picture sits on the slide background without a visible box."""
    out = []
    for fr in frames:
        a = np.asarray(fr.convert("RGBA"))
        bg = Image.new("RGBA", fr.size, NAVY + (255,))
        rgb = over(bg, fr).convert("RGB")
        q = rgb.quantize(colors=min(colors, 254), method=Image.MEDIANCUT, dither=Image.NONE)
        arr = np.asarray(q).copy()
        arr[a[..., 3] < 40] = 255
        pal = q.getpalette()[:765]
        pal = pal + [0] * (765 - len(pal)) + [0, 0, 0]
        im = Image.fromarray(arr, "P")
        im.putpalette(pal)
        out.append(im)
    out[0].save(os.path.join(OUT, name), save_all=True, append_images=out[1:], duration=ms, loop=0, disposal=2,
                transparency=255, optimize=False)


# flickering flames (one per element + a big orange one for the demos)
for key, (c, s_) in FLAMES.items():
    n = 12
    fr = []
    for f in range(n):
        ph = 2 * math.pi * f / n
        fr.append(flame(c, s_ + ph, 360, 600, 1.0 + 0.05 * math.sin(2 * ph + s_)))
    to_gif(fr, f"flame_{key}.gif", 80)


# orbiting atom for the title slide
def orbit_gif(S=640, n=40):
    ang = (0, 60, 120)
    cols = [(34, 211, 238), (255, 122, 26), (182, 109, 255)]
    a_, b_ = S * 0.46, S * 0.17
    base = Image.new("RGBA", (S * 2, S * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(base)
    c = S
    for i, an in enumerate(ang):
        pts = []
        for k in range(361):
            t = math.radians(k)
            x, y = a_ * 2 * math.cos(t), b_ * 2 * math.sin(t)
            r = math.radians(an)
            pts.append((c + x * math.cos(r) - y * math.sin(r), c + x * math.sin(r) + y * math.cos(r)))
        d.line(pts, fill=cols[i] + (255,), width=8)
    base = glow(base.resize((S, S), Image.LANCZOS), 7, 1.3)
    frames = []
    for f in range(n):
        fr = base.copy()
        top = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        dt = ImageDraw.Draw(top)
        for i, an in enumerate(ang):
            t = math.radians(40 + 100 * i + f * 360 / n * (1 if i != 1 else -1))
            x, y = a_ * math.cos(t), b_ * math.sin(t)
            r = math.radians(an)
            px, py = S / 2 + x * math.cos(r) - y * math.sin(r), S / 2 + x * math.sin(r) + y * math.cos(r)
            dt.ellipse([px - 13, py - 13, px + 13, py + 13], fill=cols[i] + (255,))
        top = glow(top, 8, 1.5)
        nuc = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        dn = ImageDraw.Draw(nuc)
        pr = 1 + 0.12 * math.sin(2 * math.pi * f / n)
        for rr, col in ((24 * pr, (255, 122, 26, 255)), (15 * pr, (255, 214, 120, 255)), (7 * pr, (255, 255, 255, 255))):
            dn.ellipse([S / 2 - rr, S / 2 - rr, S / 2 + rr, S / 2 + rr], fill=col)
        nuc = glow(nuc, 14, 1.8)
        frames.append(over(over(fr, top), nuc))
    to_gif(frames, "atom_orbit.gif", 60, 160)


orbit_gif()


# sodium ball racing around on water (fizz, bubbles, sparks)
def sodium_gif(W=720, H=400, n=36):
    rng = np.random.default_rng(4)
    frames = []
    water_y = int(H * 0.55)
    ys, xs = np.mgrid[0:H, 0:W].astype(float)
    wcol = np.zeros((H, W, 4))
    depth = np.clip((ys - water_y) / (H - water_y), 0, 1)
    wcol[..., 0] = 20 + 10 * (1 - depth)
    wcol[..., 1] = 110 + 50 * (1 - depth)
    wcol[..., 2] = 200 - 40 * depth
    wcol[..., 3] = (ys > water_y) * 255
    water = Image.fromarray(wcol.astype("uint8"), "RGBA")
    sparks_state = []
    for f in range(n):
        t = f / n
        fr = water.copy()
        d = ImageDraw.Draw(fr)
        # wavy surface
        for x in range(0, W, 4):
            yy = water_y + 4 * math.sin((x / 40.0) + 2 * math.pi * t * 2)
            d.line([(x, yy), (x + 4, yy)], fill=(200, 235, 255, 255), width=3)
        bx = W * (0.5 + 0.36 * math.sin(2 * math.pi * t * 2))
        by = water_y - 12 + 6 * math.sin(2 * math.pi * t * 6)
        # fizz bubbles behind
        for j in range(10):
            ph = (t * 3 + j * 0.13) % 1
            x = bx - 40 * math.cos(2 * math.pi * t * 2) * ph * 2 + rng.normal(0, 8)
            y = water_y + 18 + ph * 90
            rr = 4 + 5 * (1 - ph)
            d.ellipse([x - rr, y - rr, x + rr, y + rr], outline=(230, 250, 255, 200), width=2)
        # silver ball
        d.ellipse([bx - 20, by - 20, bx + 20, by + 20], fill=(210, 215, 230, 255), outline=(255, 255, 255, 255), width=2)
        d.ellipse([bx - 11, by - 12, bx - 2, by - 3], fill=(255, 255, 255, 255))
        # orange-yellow sparks
        for j in range(8):
            a = rng.uniform(0, 2 * math.pi)
            ln_ = rng.uniform(14, 36)
            x0, y0 = bx + math.cos(a) * 24, by + math.sin(a) * 24
            if math.sin(a) > 0.4:
                continue
            d.line([x0, y0, x0 + math.cos(a) * ln_, y0 + math.sin(a) * ln_], fill=(255, rng.integers(150, 230), 30, 255), width=3)
        frames.append(glow(fr, 5, 1.0))
    to_gif(frames, "sodium_water.gif", 70, 200)


sodium_gif()


# pulsing sun
def sun_gif(S=480, n=18):
    sun_img = Image.open(os.path.join(OUT, "sun.png")).convert("RGBA").resize((S, S), Image.LANCZOS)
    frames = []
    for f in range(n):
        sc = 1 + 0.035 * math.sin(2 * math.pi * f / n)
        sz = int(S * sc)
        im = sun_img.resize((sz, sz), Image.LANCZOS)
        canvas = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        canvas.paste(im, ((S - sz) // 2, (S - sz) // 2), im)
        frames.append(canvas)
    to_gif(frames, "sun_pulse.gif", 90, 200)


sun_gif()

with open(os.path.join(OUT, "meta.json"), "w") as f:
    json.dump(META, f)
print("images done:", sorted(os.listdir(OUT)))
