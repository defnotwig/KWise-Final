export const parseSpecs = (specString) => {
    const specs = {
      cores: 0,
      threads: 0,
      boostGHz: 0,
    };
  
    const coreMatch = specString.match(/(\d+)\s*Cores/i);
    const threadMatch = specString.match(/(\d+)\s*Threads/i);
    const boostMatch = specString.match(/([\d.]+)\s*GHz\s*Boost/i);
  
    if (coreMatch) specs.cores = Number.parseInt(coreMatch[1], 10);
    if (threadMatch) specs.threads = Number.parseInt(threadMatch[1], 10);
    if (boostMatch) specs.boostGHz = Number.parseFloat(boostMatch[1]);
  
    return specs;
  };
  
  export const calculatePerformanceScore = (specs) => {
    // Give weight to cores, threads, and boost clock
    return specs.cores * 2 + specs.threads * 1.5 + specs.boostGHz * 10;
  };