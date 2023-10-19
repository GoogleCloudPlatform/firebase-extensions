package com.pipeline;

import org.joda.time.DateTime;
import org.joda.time.Days;
import org.joda.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class Utils {
  private static final Logger LOG = LoggerFactory.getLogger(Utils.class);

  public static String adjustDate(Instant timestamp) {
    DateTime providedDate = new DateTime(timestamp);
    DateTime now = DateTime.now();

    int daysDiff = Days.daysBetween(providedDate.withTimeAtStartOfDay(), now.withTimeAtStartOfDay()).getDays();

    LOG.info("The provided date is " + providedDate.toString("yyyy-MM-dd HH:mm:ss"));
    LOG.info(daysDiff + " days difference between now and the provided date");

    if (providedDate.isAfterNow()) {
      // The provided date is in the future
      throw new IllegalArgumentException("The provided date is in the future!");
    }

    if (daysDiff > 7) {
      // Set the date representing 7 days before the "now" date
      return now.minusDays(7).toString("yyyy-MM-dd HH:mm:ss");
    }

    return providedDate.toString("yyyy-MM-dd HH:mm:ss");
  }

}
