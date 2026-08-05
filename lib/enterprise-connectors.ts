import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { dirname, join } from 'path';

export interface ConnectorResult {
  ok: boolean;
  connector: string;
  action: string;
  findings: unknown[];
  error?: string;
  costUsd: number;
}

export interface EnterpriseConnector {
  readonly id: string;
  search(query: string): Promise<ConnectorResult> | ConnectorResult;
  read(identifier: string): Promise<ConnectorResult> | ConnectorResult;
  writeDraft(identifier: string, content: string): Promise<ConnectorResult> | ConnectorResult;
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

class LocalFilesConnector implements EnterpriseConnector {
  readonly id = 'local_files';
  private root: string;

  constructor(root = 'data/connectors/local-files') {
    this.root = root;
    ensureDir(this.root);
  }

  search(query: string): ConnectorResult {
    try {
      const entries = readdirSync(this.root);
      const lowerQuery = query.toLowerCase();
      const findings = entries
        .filter((name) => name.toLowerCase().includes(lowerQuery))
        .map((name) => ({ name, path: join(this.root, name) }));
      return { ok: true, connector: this.id, action: 'search', findings, costUsd: 0 };
    } catch (error) {
      return { ok: false, connector: this.id, action: 'search', findings: [], error: String(error), costUsd: 0 };
    }
  }

  read(identifier: string): ConnectorResult {
    try {
      const safePath = join(this.root, identifier.replace(/^(\.\/(\.\/)?)+/, '').replace(/^\/+/, ''));
      if (!safePath.startsWith(this.root)) {
        return { ok: false, connector: this.id, action: 'read', findings: [], error: 'Path escape not allowed', costUsd: 0 };
      }
      const content = readFileSync(safePath, 'utf8');
      return { ok: true, connector: this.id, action: 'read', findings: [{ path: safePath, content }], costUsd: 0 };
    } catch (error) {
      return { ok: false, connector: this.id, action: 'read', findings: [], error: String(error), costUsd: 0 };
    }
  }

  writeDraft(identifier: string, content: string): ConnectorResult {
    try {
      const safePath = join(this.root, identifier.replace(/^(\.\/(\.\/)?)+/, '').replace(/^\/+/, ''));
      if (!safePath.startsWith(this.root)) {
        return { ok: false, connector: this.id, action: 'writeDraft', findings: [], error: 'Path escape not allowed', costUsd: 0 };
      }
      ensureDir(dirname(safePath));
      writeFileSync(safePath, content, 'utf8');
      return { ok: true, connector: this.id, action: 'writeDraft', findings: [{ path: safePath, bytes: content.length }], costUsd: 0 };
    } catch (error) {
      return { ok: false, connector: this.id, action: 'writeDraft', findings: [], error: String(error), costUsd: 0 };
    }
  }
}

class GithubReadConnector implements EnterpriseConnector {
  readonly id = 'github_read';

  async search(query: string): Promise<ConnectorResult> {
    try {
      const res = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=5`, {
        headers: { Accept: 'application/vnd.github+json' },
      });
      if (!res.ok) throw new Error(`GitHub API ${res.status}`);
      const data = (await res.json()) as { items?: Array<{ full_name: string; description: string | null; html_url: string }> };
      const findings = (data.items || []).map((item) => ({ name: item.full_name, description: item.description, url: item.html_url }));
      return { ok: true, connector: this.id, action: 'search', findings, costUsd: 0 };
    } catch (error) {
      return { ok: false, connector: this.id, action: 'search', findings: [], error: String(error), costUsd: 0 };
    }
  }

  async read(identifier: string): Promise<ConnectorResult> {
    try {
      const [owner, repo, ...pathParts] = identifier.split('/');
      const path = pathParts.join('/') || '';
      const url = path
        ? `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
        : `https://api.github.com/repos/${owner}/${repo}`;
      const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
      if (!res.ok) throw new Error(`GitHub API ${res.status}`);
      const data = await res.json();
      return { ok: true, connector: this.id, action: 'read', findings: [data], costUsd: 0 };
    } catch (error) {
      return { ok: false, connector: this.id, action: 'read', findings: [], error: String(error), costUsd: 0 };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  writeDraft(_identifier: string, _content: string): ConnectorResult {
    return { ok: false, connector: this.id, action: 'writeDraft', findings: [], error: 'github_read is read-only', costUsd: 0 };
  }
}

class WebSearchConnector implements EnterpriseConnector {
  readonly id = 'public_web_search';

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  search(_query: string): ConnectorResult {
    const message =
      'public_web_search is declared in the connector registry but has no configured provider. Set SERP_API_KEY, BRAVE_API_KEY, or configure a search proxy to enable live results.';
    return { ok: true, connector: this.id, action: 'search', findings: [], error: message, costUsd: 0 };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  read(_identifier: string): ConnectorResult {
    return { ok: false, connector: this.id, action: 'read', findings: [], error: 'public_web_search is search-only', costUsd: 0 };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  writeDraft(_identifier: string, _content: string): ConnectorResult {
    return { ok: false, connector: this.id, action: 'writeDraft', findings: [], error: 'public_web_search is read-only', costUsd: 0 };
  }
}

const CONNECTORS: Record<string, EnterpriseConnector> = {
  local_files: new LocalFilesConnector(),
  github_read: new GithubReadConnector(),
  public_web_search: new WebSearchConnector(),
};

export function getConnector(id: string): EnterpriseConnector | undefined {
  return CONNECTORS[id];
}

export function listConnectors(): string[] {
  return Object.keys(CONNECTORS);
}

export { LocalFilesConnector, GithubReadConnector, WebSearchConnector };
