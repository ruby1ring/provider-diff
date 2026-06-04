package scheduler

import (
	"math"
	"math/rand"
	"time"
)

func Interval(rate, burstiness float64, rng *rand.Rand) time.Duration {
	if rate <= 0 || math.IsInf(rate, 1) {
		return 0
	}
	if burstiness <= 0 {
		burstiness = 1
	}
	seconds := gamma(rng, burstiness, 1/(burstiness*rate))
	if seconds < 0 {
		seconds = 0
	}
	return time.Duration(seconds * float64(time.Second))
}

func gamma(rng *rand.Rand, shape, scale float64) float64 {
	if shape < 1 {
		u := rng.Float64()
		return gamma(rng, shape+1, scale) * math.Pow(u, 1/shape)
	}
	d := shape - 1.0/3.0
	c := 1 / math.Sqrt(9*d)
	for {
		x := rng.NormFloat64()
		v := 1 + c*x
		if v <= 0 {
			continue
		}
		v = v * v * v
		u := rng.Float64()
		if u < 1-0.0331*x*x*x*x {
			return scale * d * v
		}
		if math.Log(u) < 0.5*x*x+d*(1-v+math.Log(v)) {
			return scale * d * v
		}
	}
}
