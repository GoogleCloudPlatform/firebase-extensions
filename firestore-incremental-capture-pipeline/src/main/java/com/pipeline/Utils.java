package com.pipeline;

import org.joda.time.DateTime;
import org.joda.time.Days;
import org.joda.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class Utils {
  private static final Logger LOG = LoggerFactory.getLogger(Utils.class);

  public static Instant adjustDate(Instant timestamp) {
    DateTime providedDate = new DateTime(timestamp).withSecondOfMinute(0);
    DateTime now = DateTime.now().withSecondOfMinute(0);

    int daysDiff = Days.daysBetween(providedDate.withTimeAtStartOfDay(), now.withTimeAtStartOfDay()).getDays();

    LOG.info("The provided date is " + providedDate.toString("yyyy-MM-dd HH:mm:ss"));
    LOG.info(daysDiff + " days difference between now and the provided date");

    if (providedDate.isAfterNow()) {
      // The provided date is in the future
      throw new IllegalArgumentException("The provided date is in the future!");
    }

    if (daysDiff > 7) {
      // Set the date representing 7 days before the "now" date
      return Instant.parse(now.minusDays(7).toString("yyyy-MM-dd'T'HH:mm:ss.SSS"));
    }

    return Instant.parse(providedDate.toString("yyyy-MM-dd'T'HH:mm:ss.SSS"));
  }

}
