declare module 'jsforce' {
  class Connection {
    [key: string]: any;
    constructor(...args: any[]): Connection;
    login(...args: any[]): Promise<any>;
    query(...args: any[]): Promise<any>;
    sobject(...args: any[]): any;
  }
  export = Connection;
}

declare module 'express-session' {
  function session(options?: any): any;
  export = session;
  
  interface SessionData {
    returnUrl?: string;
    userId?: string;
    salesforceUserId?: string;
    salesforceOrgId?: string;
    csrfToken?: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      session: {
        returnUrl?: string;
        userId?: string;
        salesforceUserId?: string;
        salesforceOrgId?: string;
        csrfToken?: string;
        id?: string;
        regenerate: (callback: () => void) => void;
        destroy: (callback: () => void) => void;
      };
    }
  }
}
