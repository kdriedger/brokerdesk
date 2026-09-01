/**
 * Paginated response envelope wrapping a single page of list results.
 *
 * Every list endpoint in BrokerDesk returns this envelope so clients can
 * drive page navigation and infinite scrolling uniformly across modules.
 *
 * @author BrokerDesk
 */
export interface IPage<T> {
  /** Pagination metadata describing the returned page. */
  pagination: IPage.IPagination;

  /** Page of records for the requested resource. */
  data: T[];
}

export namespace IPage {
  /**
   * Common pagination request fields for list (index) endpoints.
   */
  export interface IRequest {
    /** 1-based page number; defaults to 1. */
    page?: number;
    /** Maximum records per page; defaults to 100. */
    limit?: number;
  }

  /**
   * Pagination metadata attached to every {@link IPage} response.
   */
  export interface IPagination {
    /** 1-based index of the returned page. */
    page: number;

    /** Maximum number of records returned per page. */
    limit: number;

    /** Total number of records matching the query across all pages. */
    total_count: number;

    /** Total number of pages available at the current limit. */
    total_pages: number;
  }
}
