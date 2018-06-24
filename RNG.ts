export class RNG {
    private seed:number;

    constructor(seed?:number) {
        if (seed)
            this.seed = seed;
        else
            this.seed = Math.random() * 9999999999;
    }

    private next(min:number, max:number):number {
        max = max || 0;
        min = min || 0;

        this.seed = (this.seed * 9301 + 49297) % 233280;
        var rnd = this.seed / 233279;

        return min + rnd * (max - min);
    }

    // http://indiegamr.com/generate-repeatable-random-numbers-in-js/
    public nextInt(min:number, max:number):number {
        return Math.floor(this.next(min, max));
    }

    public nextDouble():number {
        return this.next(0, 1);
    }

    public range(a:number, b:number):number {
        return this.next(a, b);
    }

    public chance(ch:number):boolean {
        return this.nextDouble() < ch;
    }
    public pick<T>(collection:T[]):T {
        return collection[this.nextInt(0, collection.length)];
    }

    public pickW<T>(collection:T[], wts:number[]):T {
        if (collection.length != wts.length) return undefined;
        var s = 0;
        for (var w of wts) s += w;
        let ch = this.nextDouble() * s;
        for (var i = 0; i < collection.length; i++)
        {
            if (ch < wts[i]) return collection[i];
            ch -= wts[i];
        }
        return undefined;
    }
    
    public shuffle(arr:any[]) {
        for (let i = 0; i < arr.length; i++)
        {
            let j = this.nextInt(0, arr.length);
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    // faster than added uniform 
    haveNextNextGaussian = false
    nextNextGaussian = 0
    nextGaussian():number {
        // See Knuth, ACP, Section 3.4.1 Algorithm C.
        if (this.haveNextNextGaussian) {
            this.haveNextNextGaussian = false;
            return this.nextNextGaussian;
        } else {
            var v1:number, v2:number, s:number;
            do {
                v1 = 2 * this.nextDouble() - 1; // between -1 and 1
                v2 = 2 * this.nextDouble() - 1; // between -1 and 1
                s = v1 * v1 + v2 * v2;
            } while (s >= 1 || s == 0);
            let multiplier = Math.sqrt(-2 * Math.log(s)/s);
            this.nextNextGaussian = v2 * multiplier;
            this.haveNextNextGaussian = true;
            return v1 * multiplier;
        }
    }

}