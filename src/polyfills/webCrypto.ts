import { Platform } from 'react-native';
import * as ExpoCrypto from 'expo-crypto';

function normalizeDigestAlgorithm(algorithm: AlgorithmIdentifier): string {
  return typeof algorithm === 'string' ? algorithm : algorithm.name;
}

if (Platform.OS !== 'web') {
  const currentCrypto = globalThis.crypto as (Crypto & { subtle?: Partial<SubtleCrypto> }) | undefined;

  if (!currentCrypto?.subtle?.digest) {
    const digest: SubtleCrypto['digest'] = async (algorithm, data) => {
      const normalizedAlgorithm = normalizeDigestAlgorithm(algorithm).toUpperCase();

      if (normalizedAlgorithm !== 'SHA-256') {
        throw new Error(`Unsupported digest algorithm: ${normalizedAlgorithm}`);
      }

      return ExpoCrypto.digest(ExpoCrypto.CryptoDigestAlgorithm.SHA256, data);
    };

    const subtle = {
      ...currentCrypto?.subtle,
      digest,
    } as SubtleCrypto;

    if (currentCrypto) {
      Object.defineProperty(currentCrypto, 'subtle', {
        value: subtle,
        configurable: true,
      });
    } else {
      Object.defineProperty(globalThis, 'crypto', {
        value: {
          getRandomValues: ExpoCrypto.getRandomValues,
          subtle,
        },
        configurable: true,
      });
    }
  }
}
