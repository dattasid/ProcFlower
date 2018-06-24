export class Color{
    public red:number;
    public green:number;
    public blue:number;

    public normalize()
    {
        this.red = Math.max(0, Math.min(1, this.red));
        this.green = Math.max(0, Math.min(1, this.green));
        this.blue = Math.max(0, Math.min(1, this.blue));
    }

    private static to2bHex(val:number):string
    {
        let s = ("0"+Math.round(val * 255).toString(16).toUpperCase());
        return s.substr(s.length - 2);
    }

    public toHex():string
    {
        this.normalize();

        return "#"+Color.to2bHex(this.red) + Color.to2bHex(this.green) + Color.to2bHex(this.blue);


    }

}

export function hsbToRGB(hue:number, saturation:number, value:number) : Color
{
    hue -= Math.floor(hue);
    hue *= 360;
    hue %= 360;
    saturation = Math.min(Math.max(0, saturation), 1);
    value = Math.min(1, Math.max(0, value));
//            alpha = Math.min(1, Math.max(0, this.alpha));

    let rgb = new Color();
    var i;
    var f, p, q, t;

    if (saturation === 0) {
        // achromatic (grey)
        rgb.red = value;
        rgb.green = value;
        rgb.blue = value;
//        rgb.alpha = this.alpha;
        return rgb;
    }

    var h = hue / 60; // sector 0 to 5
    i = Math.floor(h);
    f = h - i; // factorial part of h
    p = value * (1 - saturation);
    q = value * (1 - saturation * f);
    t = value * (1 - saturation * (1 - f));

    switch (i) {
        case 0:
            rgb.red = value;
            rgb.green = t;
            rgb.blue = p;
            break;
        case 1:
            rgb.red = q;
            rgb.green = value;
            rgb.blue = p;
            break;
        case 2:
            rgb.red = p;
            rgb.green = value;
            rgb.blue = t;
            break;
        case 3:
            rgb.red = p;
            rgb.green = q;
            rgb.blue = value;
            break;
        case 4:
            rgb.red = t;
            rgb.green = p;
            rgb.blue = value;
            break;
        default: // case 5:
            rgb.red = value;
            rgb.green = p;
            rgb.blue = q;
            break;
    }

//            rgb.alpha = this.alpha;

    return rgb;
}